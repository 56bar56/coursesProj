import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { LlmClientService } from './llm-client.service';

@Module({
  controllers: [AiChatController],
  providers: [AiChatService, LlmClientService],
})
export class AiChatModule {}
