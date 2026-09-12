import {  Module } from '@nestjs/common';
import {ChannelsController} from './channels.controller';
import { ChannelsService } from './channels.service';
import { StorageModule } from '../storage/storage.module';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [StorageModule, MessagesModule, NotificationsModule],
  controllers: [ChannelsController],
  providers: [ChannelsService],
})
export class ChannelsModule {}