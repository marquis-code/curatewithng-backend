import { IsArray, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SourcingFeeTierDto {
  @IsNumber()
  minAmount: number;

  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @IsNumber()
  percentage: number;
}

export class UpdateSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourcingFeeTierDto)
  sourcingFeeTiers: SourcingFeeTierDto[];
}
