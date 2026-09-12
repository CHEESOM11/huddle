import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';

import { DmsService } from './dms.service';

@Controller('dms')
export class DmsController {
  constructor(
    private readonly dmsService: DmsService,
  ) {}

  @Post()
  async createConversation(
    @Body('userIds') userIds: string[],
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    const conversation =
      await this.dmsService.createConversation(
        userIds,
        accessToken,
      );

    return {
      message: 'Conversation created successfully.',
      conversation,
    };
  }

  @Get()
  async getConversations(
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    const conversations =
      await this.dmsService.getConversations(
        accessToken,
      );

    return {
      message: 'Conversations retrieved successfully.',
      conversations,
    };
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    const messages =
      await this.dmsService.getMessages(
        conversationId,
        accessToken,
      );

    return {
      message: 'Direct messages retrieved successfully.',
      messages,
    };
  }

  @Post(':id/messages')
  async sendMessage(
    @Param('id') conversationId: string,
    @Body('content') content: string,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    const message =
      await this.dmsService.sendMessage(
        conversationId,
        content,
        accessToken,
      );

    return {
      message: 'Direct message sent successfully.',
      data: message,
    };
  }
}