import { IsOptional, IsString, IsArray, IsObject, IsBoolean, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  preferences?: {
    occasions?: string[];
    budgetRange?: { min: number; max: number };
    interests?: string[];
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  corporateProfile?: {
    companyName?: string;
    position?: string;
    teamSize?: number;
  };
}
