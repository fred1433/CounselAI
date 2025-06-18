import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractsGateway } from './contracts.gateway';

@Module({
  imports: [ConfigModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractsGateway]
})
export class ContractsModule {} 