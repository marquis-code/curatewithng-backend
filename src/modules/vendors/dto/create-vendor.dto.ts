import { IsString, IsArray, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty({ example: 'Lagos' })
  @IsString()
  state: string;

  @ApiProperty({ example: 'Ikeja' })
  @IsString()
  city: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

class BankDetailsDto {
  @ApiProperty({ example: 'Access Bank' })
  @IsString()
  bankName: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 'CurateWithNG Ltd' })
  @IsString()
  accountName: string;
}

export class CreateVendorDto {
  @ApiProperty({ example: 'Luxury Hampers NG' })
  @IsString()
  businessName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiProperty({ example: ['hampers', 'corporate'] })
  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;
}
