import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class GenerateDescriptionDto {
  @IsNotEmpty()
  @IsString()
  jobTitle: string;

  @IsNotEmpty()
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  companyBusiness?: string;
} 