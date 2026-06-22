import { IsString, IsNumber, IsArray, IsOptional, IsEnum, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetTier } from '../../../shared/types';

export class CreateGiftDto {
  @ApiProperty({ example: 'Premium Gift Hamper' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'A luxurious hamper with chocolates, wine, and treats' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'hampers' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: ['luxury', 'chocolate', 'wine'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: ['https://res.cloudinary.com/...'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ example: 2500000, description: 'Price in kobo (NGN)' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 2000000, description: 'Discount price in kobo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  @ApiProperty({ example: ['birthday', 'christmas', 'corporate'] })
  @IsArray()
  @IsString({ each: true })
  occasions: string[];

  @ApiProperty({ example: ['her', 'him', 'couple'] })
  @IsArray()
  @IsString({ each: true })
  recipientTypes: string[];

  @ApiProperty({ enum: BudgetTier, example: BudgetTier.PREMIUM })
  @IsEnum(BudgetTier)
  budgetTier: BudgetTier;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  stock: number;
}
