import {
  Injectable,
  Inject,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GenerateContractDto } from './dto/generate-contract.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';
import { Express } from 'express';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ContractsService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject('GEMINI_API_KEY') private readonly gemini_api_key: string,
  ) {
    this.genAI = new GoogleGenerativeAI(this.gemini_api_key);
  }

  private getModel(modelName?: string): GenerativeModel {
    const defaultModel = this.configService.get<string>(
      'GEMINI_MODEL_NAME',
      'gemini-1.5-flash',
    );
    const finalModelName = modelName || defaultModel;
    this.logger.log(`Using model: ${finalModelName}`);
    return this.genAI.getGenerativeModel({ model: finalModelName });
  }

  private cleanLLMResponse(response: string): string {
    const markdownCodeBlockRegex = /```(markdown)?\s*([\s\S]*?)\s*```/g;
    const cleanedResponse = response.replace(markdownCodeBlockRegex, '$2');
    return cleanedResponse.trim();
  }

  private async extractTextFromFile(
    file: Express.Multer.File,
  ): Promise<string> {
    this.logger.log(
      `Extracting text from file: ${file.originalname} (${file.mimetype})`,
    );

    try {
      if (file.mimetype === 'application/pdf') {
        const data = await pdfParse(file.buffer);
        return data.text;
      } else if (
        file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const { value } = await mammoth.extractRawText({
          buffer: file.buffer,
        });
        return value;
      } else if (
        file.mimetype === 'text/plain' ||
        file.mimetype === 'text/markdown'
      ) {
        return file.buffer.toString('utf-8');
      } else {
        throw new InternalServerErrorException('Unsupported file type');
      }
    } catch (error) {
      this.logger.error(`Error extracting text from file: ${error.message}`);
      throw new InternalServerErrorException(
        'Failed to extract text from file.',
      );
    }
  }

  async generateContract(
    contractData: string, // Accept string to manually parse and validate
    templateFile?: Express.Multer.File,
    model?: string,
  ): Promise<string> {
    let contractDto: GenerateContractDto;
    try {
      const parsedData = JSON.parse(contractData);
      contractDto = plainToClass(GenerateContractDto, parsedData);
    } catch (error) {
      throw new BadRequestException('Invalid JSON format for contractData');
    }

    const errors = await validate(contractDto);

    if (errors.length > 0) {
      // Format errors to be more readable
      const formattedErrors = errors.map(err => ({
        property: err.property,
        constraints: err.constraints,
      }));
      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    let prompt = '';
    if (templateFile) {
      this.logger.log('Template file detected, starting text extraction.');
      const userTemplate = await this.extractTextFromFile(templateFile);
      this.logger.log('Text extraction successful.');
      prompt = this.buildPromptFromTemplate(contractDto, userTemplate);
    } else {
        this.logger.log('Constructing prompt from scratch (no template provided).');
      prompt = this.buildPromptFromData(contractDto);
    }

    try {
      this.logger.log('Sending prompt to Gemini API...');
      const geminiPro = this.getModel(model);
      const result = await geminiPro.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      const cleanedText = this.cleanLLMResponse(text);
      
      this.logger.log('Contract generation successful.');
      
      return cleanedText;
    } catch (error) {
      this.logger.error('Error generating contract with Gemini:', error);
      if (error instanceof Error) {
        throw new InternalServerErrorException(
          `Gemini API Error: ${error.message}`,
        );
      }
      throw new InternalServerErrorException('Failed to generate contract.');
    }
  }

  async editContract(
    history: { role: 'user' | 'assistant'; content: string }[],
    requestId: string,
  ): Promise<{ contract: string }> {
    this.logger.log(
      `[SERVICE] Editing contract for ID ${requestId} based on history.`,
    );
    const prompt = this.buildEditPrompt(history);
    try {
      this.logger.log(`[SERVICE] Calling Gemini for ID: ${requestId}`);
      const geminiPro = this.getModel(); // Edit always uses the default model
      const result = await geminiPro.generateContent(prompt);
      const response = await result.response;
      const cleanedText = this.cleanLLMResponse(response.text());
      this.logger.log(`[SERVICE] Gemini response received for ID: ${requestId}`);
      return { contract: cleanedText };
    } catch (error) {
      this.logger.error(`[SERVICE] Error calling Gemini for editing on ID ${requestId}:`, error);
      throw new InternalServerErrorException(
        'Failed to edit contract via Gemini API.',
      );
    }
  }

  private buildEditPrompt(
    history: { role: 'user' | 'assistant'; content: string }[],
  ): string {
    const formattedHistory = history.map(item => 
      `**${item.role === 'user' ? 'Client' : 'Lawyer (You)'}:**\n${item.content}`
    ).join('\n\n---\n\n');

    return `
      Act as an expert US-based lawyer. You are in an ongoing conversation with a client to draft an employment agreement.
      The following is the complete history of your conversation. The client's last message is a new instruction.
      
      Your task is to read the entire conversation history to understand the context, apply the latest instruction from the client to the most recent version of the contract, and then return ONLY the full, updated, and clean Markdown text of the new contract.

      **CRITICAL RULES:**
      1.  **Analyze the ENTIRE history** to understand the evolution of the contract.
      2.  The "assistant" or "Lawyer (You)" messages contain the full contract text at that point in the conversation. Use the LAST assistant message as the base for the new edit.
      3.  The LAST message in the history is from the "user" (the client) and contains the instruction you must apply now.
      4.  Your response MUST be only the complete and updated contract text in Markdown format. Do not include any commentary, greetings, or other conversational text.

      ---
      **Conversation History:**
      ---
      ${formattedHistory}
      ---

      Now, based on the client's last instruction, provide the full and updated contract text.
    `;
  }

  private buildPromptFromData(data: GenerateContractDto): string {
    const benefitsList = Object.entries(data.benefits)
      .filter(([, value]) => value)
      .map(([key]) => `- ${key.replace(/([A-Z])/g, ' $1').trim()}`)
      .join('\n');
    
    return `
      Act as an expert US-based lawyer. Draft a formal and professional employment agreement based on the following details.
      The tone should be legal, clear, and compliant with standard US employment law.
      The output should be in Markdown format.

      **Parties:**
      - Employer: ${data.employerName}
      - Employee: ${data.employeeName}

      **Position:**
      - Job Title: ${data.jobTitle}
      - Job Description: ${data.jobDescription}

      **Terms:**
      - Start Date: ${data.startDate}
      - Term: ${data.hasNoEndDate ? 'At-will employment (no fixed term)' : 'Fixed initial term'}
      - On-site Presence: ${data.onSitePresence}

      **Compensation:**
      - Salary: ${data.salary}

      **Benefits:**
      ${benefitsList}
      ${data.otherBenefits ? `- Other: ${data.otherBenefits}`: ''}

      **Additional Clauses:**
      - Include NDA: ${data.includeNda ? 'Yes' : 'No'}
      - Include Non-Competition Clause: ${data.includeNonCompetition ? 'Yes' : 'No'}
      - Attorney to be named in the Notice provision: ${data.attyInNotice ? 'Yes' : 'No'}
      
      **Other Specifics (Prose):**
      "${data.prose}"

      ---
      Generate the full text of the employment agreement based on this information.
      Structure the document with clear sections and clauses (e.g., 1. Position, 2. Compensation, etc.).
    `;
  }

  private buildPromptFromTemplate(data: GenerateContractDto, template: string): string {
    const dataAsText = Object.entries(data)
      .map(([key, value]) => {
        if (key === 'benefits' && typeof value === 'object' && value !== null) {
          const benefits = Object.entries(value)
            .filter(([, v]) => v)
            .map(([k]) => `- ${k.replace(/([A-Z])/g, ' $1').trim()}`)
            .join('\\n');
          return `**Benefits:**\\n${benefits}`;
        }
        if (typeof value !== 'object' && value !== null && value !== '') {
            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase());
            return `**${formattedKey}:** ${value}`;
        }
        return '';
      })
      .filter(line => line)
      .join('\\n');

    return `
        Act as an expert US-based lawyer. Your task is to generate a final employment agreement.

        You will be given a raw text template extracted from a document and a list of specific details. Your job is to intelligently integrate the details into the template's structure to create a clean, final contract.
        
        **CRITICAL INSTRUCTIONS:**
        1.  **CLEAN THE TEMPLATE:** The provided template text may contain artifacts from its original format, such as "Page 1", "Employee's Initials: ____", headers, or footers. You MUST identify and completely remove these artifacts from the final output. The final document should look like a clean contract, not a scanned page.
        2.  **INTEGRATE DATA:** Fill in the placeholders or relevant sections of the template (e.g., [EMPLOYER_NAME], [JOB_TITLE], [SALARY]) with the corresponding details from the 'Data to Integrate' section.
        3.  **FINAL FORMATTING:** The final output MUST be a single, coherent document formatted in clean, well-structured Markdown. Use headings (#, ##), bolding (**), and lists (-) appropriately to ensure high readability. Do not wrap the output in a code block.

        ---
        **Data to Integrate:**
        ---
        ${dataAsText}
        ---

        ---
        **Raw Text Template (to be cleaned and completed):**
        ---
        ${template}
        ---

        Now, generate the final, clean, and well-formatted Markdown contract based on all the instructions above.
    `;
  }

  async generateDescription(data: GenerateDescriptionDto): Promise<string> {
    const { jobTitle, companyName, companyBusiness } = data;
    const prompt = `
        Act as a meticulous HR specialist drafting the "Scope of Duties" section for a formal employment agreement in English.
        Your response must be a single block of text suitable for direct insertion into a larger document.
        - The first line should be a clear title like "Scope of Duties".
        - Use a bulleted list for the main duties, with each item starting with the "•" character.
        - The tone must be formal and unambiguous.
        - AVOID any markdown formatting like asterisks for bolding or lists (e.g., use "Scope of Duties", not "**Scope of Duties**").
        - The description should be purely factual and centered on the tasks and responsibilities of the role.
        - The final output must be ready to be copy-pasted directly into a legal document.

        - Job Title: ${jobTitle}
        - Company Name: ${companyName}
        ${companyBusiness ? `- Company's business: ${companyBusiness}` : ''}

        Generate the job description now.
    `;
    
    try {
      const geminiPro = this.getModel(); // Use the default model for descriptions
      const result = await geminiPro.generateContent(prompt);
      const response = result.response;
      return this.cleanLLMResponse(response.text());
    } catch (error) {
      console.error('Error generating description with AI:', error);
      throw new InternalServerErrorException('Failed to generate AI-powered description.');
    }
  }
} 