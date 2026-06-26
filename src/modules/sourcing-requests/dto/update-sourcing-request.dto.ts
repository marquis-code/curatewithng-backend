import { PartialType } from '@nestjs/swagger';
import { CreateSourcingRequestDto } from './create-sourcing-request.dto';
import { IsEnum, IsNumber, IsOptional, IsString, IsObject, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { SourcingStatus } from '../schemas/sourcing-request.schema';

export class QuoteObjectDto {
  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsNumber()
  @IsOptional()
  sourcingFee?: number;

  @IsNumber()
  @IsOptional()
  total?: number;

  @IsString()
  @IsOptional()
  breakdown?: string;
}

export class UpdateSourcingRequestDto extends PartialType(CreateSourcingRequestDto) {
  @IsEnum(SourcingStatus)
  @IsOptional()
  status?: SourcingStatus;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => QuoteObjectDto)
  quote?: QuoteObjectDto;

  @IsBoolean()
  @IsOptional()
  isAboveUserBudget?: boolean;

  @IsBoolean()
  @IsOptional()
  userConsentForBudgetExceed?: boolean;

  @IsString()
  @IsOptional()
  conciergeNote?: string;

  @IsString()
  @IsOptional()
  vendorMatch?: string;
}
