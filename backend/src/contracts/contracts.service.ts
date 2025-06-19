import { Injectable, Inject, InternalServerErrorException, forwardRef, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GenerateContractDto } from './dto/generate-contract.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';
import { ContractsGateway } from './contracts.gateway';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';
import { Express } from 'express';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ContractsService {
  private readonly geminiPro: GenerativeModel;

  constructor(
    private readonly configService: ConfigService,
    @Inject('GEMINI_API_KEY') private readonly gemini_api_key: string,
    @Inject(forwardRef(() => ContractsGateway))
    private readonly contractsGateway: ContractsGateway,
  ) {
    const modelName = this.configService.get<string>('GEMINI_MODEL_NAME', 'gemini-1.5-flash');
    const genAI = new GoogleGenerativeAI(this.gemini_api_key);
    this.geminiPro = genAI.getGenerativeModel({ model: modelName });
  }

  private cleanLLMResponse(response: string): string {
    const markdownCodeBlockRegex = /```(markdown)?\s*([\s\S]*?)\s*```/g;
    const cleanedResponse = response.replace(markdownCodeBlockRegex, '$2');
    return cleanedResponse.trim();
  }

  private async extractTextFromFile(
    file: Express.Multer.File,
  ): Promise<string> {
    this.contractsGateway.server.emit('log', {
      message: `Extracting text from file: ${file.originalname} (${file.mimetype})`,
    });

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
      this.contractsGateway.server.emit('log', {
        message: `Error extracting text from file: ${error.message}`,
        type: 'error',
      });
      throw new InternalServerErrorException(
        'Failed to extract text from file.',
      );
    }
  }

  async generateContract(
    contractData: string, // Accept string to manually parse and validate
    templateFile?: Express.Multer.File,
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
      this.contractsGateway.server.emit('log', {
        message: 'Template file detected, starting text extraction.',
      });
      const userTemplate = await this.extractTextFromFile(templateFile);
      this.contractsGateway.server.emit('log', {
        message: 'Text extraction successful.',
      });
      prompt = this.buildPromptFromTemplate(contractDto, userTemplate);
    } else {
        this.contractsGateway.server.emit('log', {
        message: 'Constructing prompt from scratch (no template provided).',
      });
      prompt = this.buildPromptFromData(contractDto);
    }

    try {
      this.contractsGateway.server.emit('log', {
        message: 'Sending prompt to Gemini API...',
      });
      const result = await this.geminiPro.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      const cleanedText = this.cleanLLMResponse(text);
      
      this.contractsGateway.server.emit('log', {
        message: 'Contract generation successful.',
      });
      this.contractsGateway.server.emit('generation_complete', { contract: cleanedText });

      return cleanedText;
    } catch (error) {
      console.error('Error generating contract with Gemini:', error);
      this.contractsGateway.server.emit('log', {
        message: `An error occurred during contract generation: ${error.message}`,
        type: 'error',
      });
      if (error instanceof Error) {
        throw new InternalServerErrorException(
          `Gemini API Error: ${error.message}`,
        );
      }
      throw new InternalServerErrorException('Failed to generate contract.');
    }
  }

  async editContract(
    currentContract: string,
    instruction: string,
  ): Promise<{ contract: string }> {
    this.contractsGateway.server.emit('log', {
      message: 'Editing contract with instruction: ' + instruction,
    });
    const prompt = this.buildEditPrompt(currentContract, instruction);
    try {
      const result = await this.geminiPro.generateContent(prompt);
      const response = await result.response;
      const cleanedText = this.cleanLLMResponse(response.text());
      this.contractsGateway.server.emit('contract_update', {
        contract: cleanedText,
      });
      return { contract: cleanedText };
    } catch (error) {
      console.error('Error calling Gemini API for editing:', error);
      this.contractsGateway.server.emit('edit_error', { error: error.message });
      throw new InternalServerErrorException(
        'Failed to edit contract via Gemini API.',
      );
    }
  }

  private buildEditPrompt(
    currentContract: string,
    instruction: string,
  ): string {
    return `
      Act as an expert US-based lawyer editing a document.
      You will be given an existing employment agreement and an instruction for a change.
      Apply the change directly to the contract and return ONLY the full, updated Markdown text of the contract.
      Do not add any commentary, preamble, or explanation. Return only the edited contract.

      **Instruction:**
      "${instruction}"

      ---

      **Current Contract Text:**
      ---
      ${currentContract}
      ---

      Apply the instruction to the contract now.
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
            .map(([k]) => k.replace(/([A-Z])/g, ' $1').trim())
            .join(', ');
          return `Benefits: ${benefits}`;
        }
        if (typeof value !== 'object') {
            return `${key}: ${value}`;
        }
        return '';
      })
      .filter(line => line)
      .join('\n');

    return `
        You are an expert legal assistant. Your task is to complete a contract template with the provided information.
        Fill in the placeholders within the template (like [EMPLOYER_NAME], [JOB_TITLE], [SALARY], etc.) with the corresponding details from the 'Information to Fill In' section.
        If the template is more generic, use the provided data to complete it as logically as possible.
        Do not invent new clauses or significantly modify the structure of the template.
        Output ONLY the completed contract text in Markdown format.

        **Contract Template to Complete:**
        ---
        ${template}
        ---

        **Information to Fill In:**
        ${dataAsText}
      `;
  }

  async generateDescription(data: GenerateDescriptionDto): Promise<string> {
    const { jobTitle, companyName, companyBusiness } = data;
    const prompt = `
      Act as a meticulous HR specialist drafting the "Scope of Duties" section for a formal employment agreement in English.

      The output MUST be a clean text summary of responsibilities, NOT markdown.
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
      const result = await this.geminiPro.generateContent(prompt);
      const response = result.response;
      return this.cleanLLMResponse(response.text());
    } catch (error) {
      console.error('Error generating description with AI:', error);
      throw new InternalServerErrorException('Failed to generate AI-powered description.');
    }
  }
} 