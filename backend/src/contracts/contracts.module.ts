import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractsGateway } from './contracts.gateway';

@Module({
  imports: [ConfigModule],
  controllers: [ContractsController],
  providers: [
    ContractsService,
    ContractsGateway,
    {
      provide: 'GEMINI_API_KEY',
      useFactory: (configService: ConfigService) =>
        configService.get('GEMINI_API_KEY'),
      inject: [ConfigService],
    },
  ],
})
export class ContractsModule {} 