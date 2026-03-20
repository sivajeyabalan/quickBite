import { ApiProperty } from '@nestjs/swagger';

export class MenuSuggestionDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Classic Chicken Burger' })
  name: string;

  @ApiProperty({ example: '8.99' })
  price: string;

  @ApiProperty({ example: 'Burgers' })
  category: string;
}

export class ChatAssistantResponseDto {
  @ApiProperty({ example: 'Try the Classic Chicken Burger or Zinger Burger for a cheesy, filling meal.' })
  reply: string;

  @ApiProperty({ type: [MenuSuggestionDto] })
  menuSuggestions: MenuSuggestionDto[];

  @ApiProperty({ type: [String], example: ['What are your popular burgers?', 'How does pickup work?'] })
  quickReplies: string[];
}

