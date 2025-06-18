import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { GenerateContractDto } from './dto/generate-contract.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';

@Controller('contracts')
export class ContractsController {
    constructor(private readonly contractsService: ContractsService) {}

    @Post('generate')
    async generateContract(@Body(new ValidationPipe()) generateContractDto: GenerateContractDto) {
        const generatedText = await this.contractsService.generateContract(generateContractDto);
        return { contract: generatedText };
    }

    @Post('generate-description')
    async generateDescription(@Body(new ValidationPipe()) generateDescriptionDto: GenerateDescriptionDto) {
        // For now, we'll return a placeholder.
        // The actual call to the AI service will be implemented in the next step.
        const generatedDescription = await this.contractsService.generateDescription(generateDescriptionDto);
        return { description: generatedDescription };
    }
} 