import {  Module } from '@nestjs/common';
import {ChannelsController} from './channels.controller';   
import { ChannelsService } from './channels.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [ChannelsController],
  providers: [ChannelsService],
})
export class ChannelsModule {}