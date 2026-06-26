import { IsString, IsNumber, IsArray, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateCurationDto {
  @ApiPropertyOptional({ example: 'Amaka' })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiProperty({ example: 'sister' })
  @IsString()
  relationship!: string;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiPropertyOptional({ example: 'female' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ example: ['fashion', 'skincare', 'cooking'] })
  @IsArray()
  @IsString({ each: true })
  interests!: string[];

  @ApiProperty({ example: 'birthday' })
  @IsString()
  occasion!: string;

  @ApiProperty({ example: 10000, description: 'Minimum budget in kobo' })
  @IsNumber()
  @Min(0)
  budgetMin!: number;

  @ApiProperty({ example: 50000, description: 'Maximum budget in kobo' })
  @IsNumber()
  @Min(0)
  budgetMax!: number;

  @ApiPropertyOptional({ example: 'She loves everything pink and recently started a new job' })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}
