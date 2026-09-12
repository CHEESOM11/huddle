import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { ChannelsModule } from "./channels/channels.module";
import { MessagesModule } from "./messages/messages.module";
import { InvitesModule } from "./invites/invites.module";
import { StorageModule } from "./storage/storage.module";
import { SearchModule } from "./search/search.module";
import { DmsModule } from './dms/dms.module';
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
        isGlobal: true,
    }),
     AuthModule,
     ChannelsModule,
     MessagesModule,
     InvitesModule,
     StorageModule,
     SearchModule,
     DmsModule,
     UsersModule,
    ],
  controllers: [],
  providers: [],
})
export class AppModule {}
