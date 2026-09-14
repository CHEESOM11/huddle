import { Module } from "@nestjs/common";

import { InvitesController } from "./invites.controller";
import { InvitesService } from "./invites.service";
import { MessagesModule } from "../messages/messages.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [MessagesModule, NotificationsModule],
  controllers: [InvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}