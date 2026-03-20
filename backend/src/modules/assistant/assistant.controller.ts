import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current.decorators';
import { Roles } from '../auth/decorators/roles.decorators';
import { ChatAssistantRequestDto } from './dto/chat-assistant-request.dto';
import { ChatAssistantResponseDto } from './dto/chat-assistant-response.dto';
import { AssistantService } from './assistant.service';

@ApiTags('Assistant')
@ApiBearerAuth('access-token')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @ApiOperation({ summary: 'Chat with QuickBite assistant (customer only)' })
  @ApiBody({ type: ChatAssistantRequestDto })
  @ApiOkResponse({ type: ChatAssistantResponseDto })
  @Roles(Role.CUSTOMER)
  @Post('chat')
  chat(
    @Body() dto: ChatAssistantRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.assistantService.chat(user.id, dto);
  }
}
