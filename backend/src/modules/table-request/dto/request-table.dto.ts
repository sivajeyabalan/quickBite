import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';

export class RequestTableDto {
  @ApiPropertyOptional({ example: 2, description: 'Number of people/party size' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  partySize?: number;

  @ApiPropertyOptional({ example: 'By window', description: 'Any special requests or notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
