import { Module } from '@nestjs/common';

import { DmsController } from './dms.controller';
import { DmsGateway } from './dms.gateway';
import { DmsService } from './dms.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [DmsController],
  providers: [DmsService, DmsGateway],
  exports: [DmsService],
})
export class DmsModule {}