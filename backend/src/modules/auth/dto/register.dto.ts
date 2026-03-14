import { IsEmail, IsString, MinLength, IsOptional, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'jane@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'secret123', minLength: 6 })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'Jane Doe' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: '+1 555 0100' })
    @IsOptional()
    @IsPhoneNumber()
    phone?: string;
}