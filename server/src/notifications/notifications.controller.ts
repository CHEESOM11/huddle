import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';

import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return {
      publicKey: this.notificationsService.getVapidPublicKey(),
    };
  }

  @Post('subscribe')
  async subscribe(
    @Body('subscription') subscription: any,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    return this.notificationsService.saveSubscription(
      accessToken,
      subscription,
    );
  }

  @Post('unsubscribe')
  async unsubscribe(
    @Body('endpoint') endpoint: string,
    @Headers('authorization') authorization: string,
  ) {
    const accessToken =
      authorization?.replace(/^Bearer\s+/i, '');

    return this.notificationsService.deleteSubscription(
      accessToken,
      endpoint,
    );
  }
}
