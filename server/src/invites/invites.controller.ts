import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from "@nestjs/common";

import { InvitesService } from "./invites.service";

@Controller("invites")
export class InvitesController {
  constructor(
    private readonly invitesService: InvitesService,
  ) {}

  
  @Get(":code")
  async getInvite(
    @Param("code") code: string,
  ) {
    return this.invitesService.getInvite(code);
  }


  @Post(":code/accept")
  async acceptInvite(
    @Param("code") code: string,
    @Headers("authorization") authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, "");

    return this.invitesService.acceptInvite(
      code,
      accessToken,
    );
  }
}