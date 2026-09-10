import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';

import { MessagesService } from './messages.service';

@Controller('channels')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
  ) {}

  /**
   * REST endpoint for sending a message.
   *
   * POST /api/channels/:channelId/messages
   */
  @Post(':channelId/messages')
  async sendMessage(
    @Param('channelId') channelId: string,

    @Body('content') content: string,

    @Headers('authorization')
    authorization: string,
  ) {
    const accessToken =
      authorization?.replace(
        /^Bearer\s+/i,
        '',
      );

    const message =
      await this.messagesService.sendMessage(
        channelId,
        content,
        accessToken,
      );

    return {
      message: 'Message sent successfully.',
      data: message,
    };
  }

  /**
   * REST endpoint for retrieving message history.
   *
   * GET /api/channels/:channelId/messages
   */
  @Get(':channelId/messages')
  async getMessages(
    @Param('channelId') channelId: string,

    @Headers('authorization')
    authorization: string,
  ) {
    const accessToken =
      authorization?.replace(
        /^Bearer\s+/i,
        '',
      );

    const messages =
      await this.messagesService.getMessages(
        channelId,
        accessToken,
      );

    return {
      message:
        'Messages retrieved successfully.',
      data: messages,
    };
  }
}