import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerateContractDto } from './dto/generate-contract.dto';

@Injectable()
export class ContractsService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined. Please check your .env file.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    this.modelName = this.configService.get<string>('GEMINI_MODEL_NAME', 'gemini-pro');
  }

  async generateContract(
    contractData: GenerateContractDto,
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });

    const prompt = this.buildPrompt(contractData);

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      // TODO: Gérer les erreurs de manière plus robuste
      throw new Error('Failed to generate contract from Gemini API.');
    }
  }

  async editContract(currentContract: string, instruction: string): Promise<{ contract: string }> {
    const prompt = this.buildEditPrompt(currentContract, instruction);
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const newContract = response.text();
      return { contract: newContract };
    } catch (error) {
      console.error('Error editing contract with Gemini:', error);
      throw new InternalServerErrorException('Failed to edit contract.');
    }
  }

  private buildEditPrompt(contract: string, instruction: string): string {
    return `
      Act as an expert US-based lawyer editing a document.
      You will be given an existing employment agreement and an instruction for a change.
      Apply the change directly to the contract and return ONLY the full, updated Markdown text of the contract.
      Do not add any commentary, preamble, or explanation. Return only the edited contract.

      **Instruction:**
      "${instruction}"

      ---

      **Existing Contract:**
      \`\`\`markdown
      ${contract}
      \`\`\`
    `;
  }

  private buildPrompt(data: GenerateContractDto): string {
    const benefitsList = Object.entries(data.benefits)
      .filter(([, value]) => value)
      .map(([key]) => `- ${key.replace(/([A-Z])/g, ' $1').trim()}`) // Format a readable name
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
} 