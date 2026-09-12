import {
  Body,
  Controller,
  Delete,
  Headers,
  Param,
  Post,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";
import { ChannelsService } from "./channels.service";
import { StorageService } from "../storage/storage.service";

@Controller("channels")
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  async createChannel(
    @Body("name") name: string,
    @Headers("authorization") authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, "");

    return this.channelsService.createChannel(
      name,
      accessToken,
    );
  }

  @Get()
  async getChannels(
    @Headers("authorization") authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, "");

    return this.channelsService.getChannels(
      accessToken,
    );
  }

  @Get(":channelId/members")
  async getChannelMembers(
    @Param("channelId") channelId: string,
    @Headers("authorization") authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, "");

    return this.channelsService.getChannelMembers(
      channelId,
      accessToken,
    );
  }

  @Post(":channelId/join")
  async joinChannel(
    @Param("channelId") channelId: string,
    @Headers("authorization") authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, "");

    return this.channelsService.joinChannel(
      channelId,
      accessToken,
    );
  }

  @Post(":channelId/invite")
  async inviteUser(
    @Param("channelId") channelId: string,
    @Headers("authorization") authorization: string,
  ) {
    const accessToken = authorization?.replace(/^Bearer\s+/i, "");

    return this.channelsService.inviteUser(
      channelId,
      accessToken,
    );
  }

  @Delete(":channelId")
  async deleteChannel(
    @Param("channelId") channelId: string,
    @Headers("authorization") authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, "");

    return this.channelsService.deleteChannel(
      channelId,
      accessToken,
    );
  }

  @Post(":channelId/upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @Param("channelId") channelId: string,
    @UploadedFile() file: Express.Multer.File,
    @Headers("authorization") authorization: string,
  ) {
    const accessToken = authorization?.replace(/^Bearer\s+/i, "");
    return this.storageService.uploadFile(file, channelId, accessToken);
  }

  @Get(":channelId/file")
  async getFileUrl(
    @Param("channelId") channelId: string,
    @Query("path") path: string,
    @Headers("authorization") authorization: string,
  ) {
    const accessToken = authorization?.replace(/^Bearer\s+/i, "");
    return this.storageService.getSignedUrl(path, channelId, accessToken);
  }
}
