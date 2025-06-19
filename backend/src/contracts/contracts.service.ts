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
    let cleanedText = response;

    // 1. Remove markdown code blocks if they exist
    cleanedText = cleanedText.replace(/```(markdown)?\s*([\s\S]*?)\s*```/g, '$2');

    // 2. Remove any disclaimers or attorney's notes, often wrapped in ***
    const disclaimerRegex =
      /\*{3,}[\s\S]*?(DISCLAIMER|NOTE|ATTORNEY'S NOTE)[\s\S]*?\*{3,}/gim;
    cleanedText = cleanedText.replace(disclaimerRegex, '');

    // 3. Remove any conversational preamble before the main contract title
    // This finds the first real markdown heading and takes everything from there onwards.
    const firstHeadingIndex = cleanedText.search(/^#+\s/m);
    if (firstHeadingIndex > -1) {
      cleanedText = cleanedText.substring(firstHeadingIndex);
    }

    // 4. Final trim
    return cleanedText.trim();
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
      4.  Your response must begin DIRECTLY with the contract text (e.g., starting with "### EMPLOYMENT AGREEMENT"). Do not include any preamble, greetings, or conversational filler.
      5.  ABSOLUTELY DO NOT include any kind of disclaimer, warning, or note suggesting this is a template. The output must be a clean, final document.

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

    const additionalClauses = [];
    if (data.includeNda) {
      additionalClauses.push('- The contract MUST include a comprehensive Non-Disclosure Agreement (NDA) clause.');
    }
    if (data.includeNonCompetition) {
      additionalClauses.push('- The contract MUST include a standard Non-Competition clause.');
    }
    if (data.attyInNotice) {
      additionalClauses.push('- In the "Notices" section, specify that a copy of any notice should also be sent to the company\'s attorney. Use a placeholder for the attorney\'s name and address.');
    }
    if (data.prose) {
      additionalClauses.push(`- Also incorporate the following instructions from the user: "${data.prose}"`);
    }
    
    return `
      As an expert lawyer, generate a professional, legally-sound employment contract based on the following details.

      **CRITICAL INSTRUCTIONS:**
      1.  The output MUST be a complete contract in clean, well-formatted Markdown.
      2.  The tone must be formal and authoritative.
      3.  Where information is missing (e.g., company address), use a clear placeholder like [Insert Company Address].
      4.  Your response must begin DIRECTLY with the contract text (e.g., starting with "### EMPLOYMENT AGREEMENT"). Do not include any preamble, greetings, or conversational filler like "Of course, here is the contract...".
      5.  ABSOLUTELY DO NOT include any kind of disclaimer, warning, or note suggesting this is a template or that a lawyer should be consulted. The output must be a clean, final document ready for signature.

      ---
      **CONTRACT DETAILS:**

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

      ${additionalClauses.length > 0 ? `**Additional Clauses & Instructions:**\n${additionalClauses.map(c => `      ${c}`).join('\n')}` : ''}

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
      As an expert lawyer, your task is to take a user-provided contract template and fill in the specific details provided.

      **CRITICAL INSTRUCTIONS:**
      1.  Carefully review the entire provided template.
      2.  Populate the template with the details below, replacing all placeholders seamlessly and accurately.
      3.  Your response must begin DIRECTLY with the populated contract text. Do not include any preamble, greetings, or conversational filler.
      4.  ABSOLUTELY DO NOT add any disclaimers, warnings, or notes. The document should look like a final version, not a draft.

      ---
      **DETAILS TO INTEGRATE:**
      ---
      ${dataAsText}
      ---
      **USER-PROVIDED TEMPLATE:**
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