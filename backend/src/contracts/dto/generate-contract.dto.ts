import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsObject,
} from 'class-validator';

class BenefitsDto {
  @IsBoolean()
  health: boolean;

  @IsBoolean()
  dental: boolean;

  @IsBoolean()
  vacationSick: boolean;

  @IsBoolean()
  parking: boolean;

  @IsBoolean()
  profitSharing: boolean;

  @IsBoolean()
  fourZeroOneK: boolean;

  @IsBoolean()
  paidBarMembership: boolean;

  @IsBoolean()
  clePaid: boolean;

  @IsBoolean()
  cellPhone: boolean;
}

export class GenerateContractDto {
  @IsString()
  @IsNotEmpty()
  employerName: string;

  @IsString()
  @IsNotEmpty()
  employeeName: string;

  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @IsString()
  @IsOptional()
  jobDescription?: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsBoolean()
  hasInitialTerm: boolean;

  @IsBoolean()
  hasNoEndDate: boolean;

  @IsString()
  @IsOptional()
  onSitePresence?: string;

  @IsString()
  @IsNotEmpty()
  salary: string;

  @IsObject()
  @ValidateNested()
  @Type(() => BenefitsDto)
  benefits: BenefitsDto;

  @IsString()
  @IsOptional()
  otherBenefits?: string;

  @IsBoolean()
  includeNda: boolean;

  @IsBoolean()
  includeNonCompetition: boolean;

  @IsBoolean()
  attyInNotice: boolean;

  @IsString()
  @IsOptional()
  attorneyName?: string;

  @IsString()
  @IsOptional()
  prose?: string;
} 