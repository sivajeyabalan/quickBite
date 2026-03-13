import { IsString, IsOptional, IsBoolean, IsInt, Min, IsUUID, IsDecimal } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Margherita Pizza' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Classic tomato and mozzarella' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '11.50', description: 'Price as decimal string' })
  @IsDecimal({ decimal_digits: '1,2' })
  price: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/pizza.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: 25, description: 'Estimated preparation time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  prepTimeMins?: number;

  @ApiPropertyOptional({
    example: { sizes: ['9 inch', '12 inch'], extras: ['extra mozzarella'] },
    description: 'Free-form customisation options shown to customers',
  })
  @IsOptional()
  customisationOptions?: object;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Category UUID' })
  @IsUUID()
  categoryId: string;
}