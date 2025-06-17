import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { GenerateContractDto } from './dto/generate-contract.dto';

@Controller('contracts')
export class ContractsController {
    constructor(private readonly contractsService: ContractsService) {}

    @Post('generate')
    async generateContract(@Body(new ValidationPipe()) generateContractDto: GenerateContractDto) {
        const generatedText = await this.contractsService.generateContract(generateContractDto);
        return { contract: generatedText };
    }
} 