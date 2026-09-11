// import {
//   Body,
//   Controller,
//   Delete,
//   Headers,
//   Param,
//   Post,
//   Get,
// } from "@nestjs/common";

// import { ChannelsService } from "./channels.service";

// @Controller("channels")
// export class ChannelsController {
//   constructor(private readonly channelsService: ChannelsService) {}

//   @Post()
//   async createChannel(
//     @Body("name") name: string,
//     @Headers("authorization") authorization: string,
//   ) {
//     const accessToken = authorization?.replace("Bearer ", "");

//     return this.channelsService.createChannel(name, accessToken);
//   }

//   @Get()
//   async getChannels(@Headers("authorization") authorization: string) {
//     const accessToken = authorization?.replace("Bearer ", "");

//     return this.channelsService.getChannels(accessToken);
//   }

//   @Post(":channelId/join")
//   async joinChannel(
//     @Param("channelId") channelId: string,
//     @Headers("authorization") authorization: string,
//   ) {
//     const accessToken = authorization?.replace("Bearer ", "");

//     return this.channelsService.joinChannel(channelId, accessToken);
//   }

//   @Post(":channelId/invite")
//   async inviteUser(
//     @Param("channelId") channelId: string,
//     @Headers("authorization") authorization: string,
//   ) {
//     const accessToken = authorization?.replace(/^Bearer\s+/i, '');

//     return this.channelsService.inviteUser(channelId, accessToken);
//   }


//   @Delete(":channelId")
//   async deleteChannel(
//     @Param("channelId") channelId: string,
//     @Headers("authorization") authorization: string,
//   ) {
//     const accessToken = authorization?.replace(/^Bearer\s+/i, "");

//     return this.channelsService.deleteChannel(channelId, accessToken);
//   }
// }


import {
  Body,
  Controller,
  Delete,
  Headers,
  Param,
  Post,
  Get,
} from "@nestjs/common";

import { ChannelsService } from "./channels.service";

@Controller("channels")
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
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
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, "");

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
}