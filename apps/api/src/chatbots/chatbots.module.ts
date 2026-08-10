import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotsService } from './chatbots.service';
import { ChatbotsController } from './chatbots.controller';
import { PublicChatbotsController } from './public-chatbots.controller';
import { Chatbot } from './entities/chatbot.entity';
import { AllowedDomain } from './entities/allowed-domain.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Chatbot, AllowedDomain]), AiModule],
  controllers: [ChatbotsController, PublicChatbotsController],
  providers: [ChatbotsService],
  exports: [ChatbotsService],
})
export class ChatbotsModule {}
