import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
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
}
