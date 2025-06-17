import { Injectable } from '@nestjs/common';
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

  private buildPrompt(data: GenerateContractDto): string {
    const benefitsList = Object.entries(data.benefits)
      .filter(([, value]) => value)
      .map(([key]) => `- ${key.replace(/([A-Z])/g, ' $1').trim()}`) // Formatage du nom
      .join('\n');
    
    // Construction d'un prompt détaillé pour l'IA
    return `
      Rédigez un contrat de travail formel et professionnel en français.
      Le ton doit être juridique mais clair.
      Voici les détails du contrat :

      **Parties :**
      - Employeur : ${data.employerName}
      - Employé(e) : ${data.employeeName}

      **Poste :**
      - Titre du poste : ${data.jobTitle}
      - Description : ${data.jobDescription}

      **Termes du contrat :**
      - Date de début : ${data.startDate}
      - Durée : ${data.hasNoEndDate ? 'Indéterminée (CDI)' : `Terme initial défini (CDD)`}
      - Présence sur site : ${data.onSitePresence}

      **Rémunération :**
      - Salaire : ${data.salary}

      **Avantages sociaux :**
      ${benefitsList}
      ${data.otherBenefits ? `- Autres : ${data.otherBenefits}`: ''}

      **Clauses Additionnelles :**
      - Inclure une clause de non-divulgation (NDA) : ${data.includeNda ? 'Oui' : 'Non'}
      - Inclure une clause de non-concurrence : ${data.includeNonCompetition ? 'Oui' : 'Non'}
      - Nommer un avocat dans la clause de notification : ${data.attyInNotice ? 'Oui' : 'Non'}
      
      **Instructions spécifiques supplémentaires (Prose) :**
      "${data.prose}"

      ---
      Générez le texte complet du contrat basé sur ces informations.
      Structurez le document avec des articles et des sections claires (ex: Article 1 - Fonctions, Article 2 - Rémunération, etc.).
    `;
  }
} 