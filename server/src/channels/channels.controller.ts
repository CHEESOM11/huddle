import { Body, Controller, Headers, Param, Post, Get } from "@nestjs/common";

import { ChannelsService } from "./channels.service";

@Controller("channels")
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  async createChannel(
    @Body("name") name: string,
    @Headers("authorization") authorization: string,
  ) {
    const accessToken = authorization?.replace("Bearer ", "");

    return this.channelsService.createChannel(name, accessToken);
  }

  @Get()
  async getChannels(@Headers("authorization") authorization: string) {
    const accessToken = authorization?.replace("Bearer ", "");

    return this.channelsService.getChannels(accessToken);
  }

  @Post(":channelId/join")
  async joinChannel(
    @Param("channelId") channelId: string,
    @Headers("authorization") authorization: string,
  ) {
    const accessToken = authorization?.replace("Bearer ", "");

    return this.channelsService.joinChannel(channelId, accessToken);
  }
}
