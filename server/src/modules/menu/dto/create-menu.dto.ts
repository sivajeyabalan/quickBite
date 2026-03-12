import { IsString, IsOptional, IsBoolean, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { IsDecimal } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDecimal({ decimal_digits: '1,2' })
  price: string; // Decimal comes in as string from HTTP body

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  prepTimeMins?: number;

  @IsOptional()
  customisationOptions?: object;

  @IsUUID()
  categoryId: string;
}