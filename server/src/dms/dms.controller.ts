import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { DmsService } from './dms.service';
import { StorageService } from '../storage/storage.service';

@Controller('dms')
export class DmsController {
  constructor(
    private readonly dmsService: DmsService,
    private readonly storageService: StorageService,
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

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    return this.storageService.uploadDmFile(
      file,
      conversationId,
      accessToken,
    );
  }

  @Get(':id/file')
  async getFileUrl(
    @Param('id') conversationId: string,
    @Query('path') path: string,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    return this.storageService.getDmSignedUrl(
      path,
      conversationId,
      accessToken,
    );
  }
}