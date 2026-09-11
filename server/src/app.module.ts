import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { ChannelsModule } from "./channels/channels.module";
import { MessagesModule } from "./messages/messages.module";
import { InvitesModule } from "./invites/invites.module";

@Module({
  imports: [
    ConfigModule.forRoot({
        isGlobal: true,
    }),
     AuthModule,
     ChannelsModule,
     MessagesModule,
     InvitesModule,
    ],
  controllers: [],
  providers: [],
})
export class AppModule {}


