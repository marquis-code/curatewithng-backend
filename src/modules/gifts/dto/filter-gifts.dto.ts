import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../shared/pagination/pagination.dto';

export class FilterGiftsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipientType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  budgetTier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maxPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approved?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  featured?: string;
}
