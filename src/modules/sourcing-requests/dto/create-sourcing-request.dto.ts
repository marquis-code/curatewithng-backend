import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber, Min, MaxLength, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { BudgetFlexibility } from '../schemas/sourcing-request.schema';
import { Type, Transform } from 'class-transformer';

export class BudgetSignalDto {
  @IsNumber()
  @IsNotEmpty()
  ideal: number;

  @IsEnum(BudgetFlexibility)
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  flexibility: BudgetFlexibility;
}

export class CreateSourcingRequestDto {
  @IsString()
  @IsNotEmpty()
  giftIdea: string;

  @IsString()
  @IsOptional()
  occasion?: string;

  @IsObject()
  @IsOptional()
  recipientProfile?: any;

  @IsObject()
  @ValidateNested()
  @Type(() => BudgetSignalDto)
  budgetSignal: BudgetSignalDto;

  @IsString()
  @IsNotEmpty()
  timeline: string;

  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsString()
  @IsNotEmpty()
  contactEmail: string;

  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @IsString()
  @IsOptional()
  additionalNotes?: string;
}
