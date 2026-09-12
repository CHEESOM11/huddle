import { Controller, Get, Headers } from "@nestjs/common";

import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers(@Headers("authorization") authorization: string) {
    const accessToken = authorization?.replace(/^Bearer\s+/i, "");
    return this.usersService.getUsers(accessToken);
  }
}
