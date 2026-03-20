import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { GroqProvider } from './groq.provider';

@Module({
  imports: [PrismaModule],
  controllers: [AssistantController],
  providers: [AssistantService, GroqProvider],
})
export class AssistantModule {}
