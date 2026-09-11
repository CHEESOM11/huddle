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

  @Post(':channelId/messages')
  async sendMessage(
    @Param('channelId') channelId: string,
    @Body('content') content: string,
    @Headers('authorization') authorization: string,
    @Body('filePath') filePath?: string,
    @Body('fileName') fileName?: string,
    @Body('fileType') fileType?: string,
    @Body('fileSize') fileSize?: number,
    
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
        filePath,
        fileName,
        fileType,
        fileSize,
      );

    return {
      message: 'Message sent successfully.',
      data: {
        ...message,
        reactions: [],
      },
    };
  }

  @Get(':channelId/messages')
  async getMessages(
    @Param('channelId') channelId: string,
    @Headers('authorization') authorization: string,
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
      message: 'Messages retrieved successfully.',
      data: messages,
    };
  }
}