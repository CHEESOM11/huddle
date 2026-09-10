import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async signUp(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.signUp(name, email, password);
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.login(email, password);
  }

  @Get('me')
  async getCurrentUser(@Headers('authorization') authorization: string) {
    const accessToken = authorization?.replace('Bearer ', '');

    return this.authService.getCurrentUser(accessToken);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body('password') password: string,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken = authorization?.replace('Bearer ', '');

    return this.authService.resetPassword(password, accessToken);
  }

  @Get('google')
  async googleLogin() {
    return this.authService.googleLogin();
  }
}