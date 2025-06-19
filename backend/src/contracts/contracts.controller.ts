import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ValidationPipe,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { GenerateContractDto } from './dto/generate-contract.dto';
import { GenerateDescriptionDto } from './dto/generate-description.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { ContractsGateway } from './contracts.gateway';

@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly contractsGateway: ContractsGateway,
  ) {}

  @Post('generate')
  @UseInterceptors(FileInterceptor('templateFile'))
  async generateContract(
    @Body('contractData') contractData: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5 MB
        ],
        fileIsRequired: false,
      }),
    )
    templateFile?: Express.Multer.File,
  ) {
    const generatedText = await this.contractsService.generateContract(
      contractData,
      templateFile,
    );
    return { contract: generatedText };
  }

  @Post('generate-description')
  async generateDescription(
    @Body(new ValidationPipe()) generateDescriptionDto: GenerateDescriptionDto,
  ) {
    // For now, we'll return a placeholder.
    // The actual call to the AI service will be implemented in the next step.
    const generatedDescription =
      await this.contractsService.generateDescription(generateDescriptionDto);
    return { description: generatedDescription };
  }
} 