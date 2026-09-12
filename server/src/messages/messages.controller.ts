import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { MessagesService } from './messages.service';

@Controller()
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
  ) {}

  @Post('channels/:channelId/messages')
  async sendMessage(
    @Param('channelId') channelId: string,
    @Body('content') content: string,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    const message =
      await this.messagesService.sendMessage(
        channelId,
        content,
        accessToken,
      );

    return {
      message: 'Message sent successfully.',
      data: {
        ...message,
        reactions: [],
      },
    };
  }

  @Get('channels/:channelId/messages')
  async getMessages(
    @Param('channelId') channelId: string,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    const messages =
      await this.messagesService.getMessages(
        channelId,
        accessToken,
      );

    return {
      message: 'Messages retrieved successfully.',
      data: messages,
    };
  }

  @Patch('channels/:channelId/messages/:messageId')
  async editMessage(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @Body('content') content: string,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    const message =
      await this.messagesService.editMessage(
        channelId,
        messageId,
        content,
        accessToken,
      );

    return {
      message: 'Message updated successfully.',
      data: {
        ...message,
        reactions: [],
      },
    };
  }

  @Delete('channels/:channelId/messages/:messageId')
  async deleteMessage(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    return this.messagesService.deleteMessage(
      channelId,
      messageId,
      accessToken,
    );
  }

  @Get('messages/:messageId/replies')
  async getReplies(
    @Param('messageId') messageId: string,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    const replies =
      await this.messagesService.getReplies(
        messageId,
        accessToken,
      );

    return {
      message: 'Replies retrieved successfully.',
      data: replies,
    };
  }

  @Post('messages/:messageId/replies')
  async createReply(
    @Param('messageId') messageId: string,
    @Body('content') content: string,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    const reply =
      await this.messagesService.createReply(
        messageId,
        content,
        accessToken,
      );

    return {
      message: 'Reply created successfully.',
      data: reply,
    };
  }
}