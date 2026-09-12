import { Module } from '@nestjs/common';

import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
  ],
  controllers: [
    MessagesController,
  ],
  providers: [
    MessagesService,
    MessagesGateway,
  ],
  exports: [
    MessagesService,
    MessagesGateway,
  ],
})
export class MessagesModule {}