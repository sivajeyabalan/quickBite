import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Home' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 'Sarah Johnson' })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional({ example: '+1 555 0100' })
  @IsOptional()
  @IsString()
  @Matches(/^(?=.*\d)[0-9+\-\s()]+$/, {
    message: 'Phone must not contain alphabetic characters',
  })
  phone?: string;

  @ApiProperty({ example: '123 Main Street, Apt 4B' })
  @IsString()
  @MinLength(3)
  line1: string;

  @ApiPropertyOptional({ example: 'Near City Mall' })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: 'NY' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  @Matches(/^\d+$/, {
    message: 'Postal code must contain digits only',
  })
  postalCode: string;

  @ApiPropertyOptional({ example: 'Near blue gate' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}