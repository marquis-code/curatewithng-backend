import { IsEmail, IsString, MinLength, IsOptional, IsArray, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ssw0rd' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Chidi' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Okonkwo' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: ['VENDOR'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(['USER', 'VENDOR'], { each: true })
  roles?: string[];

  @ApiPropertyOptional({ example: 'My Business Name' })
  @IsOptional()
  @IsString()
  businessName?: string;
}
