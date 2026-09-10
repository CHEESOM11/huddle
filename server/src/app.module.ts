// import { Module } from "@nestjs/common";
// import { ConfigModule } from "@nestjs/config";
// import { AuthModule } from "./auth/auth.module";
// import { ChannelsModule } from "./channels/channels.module";

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//         isGlobal: true,
//     }),
//      AuthModule,
//      ChannelsModule,
//     ],
//   controllers: [],
//   providers: [],
// })
// export class AppModule {}


import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { ChannelsModule } from './channels/channels.module';
import { MessagesModule } from './messages/messsages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    AuthModule,
    ChannelsModule,
    MessagesModule,
  ],

  controllers: [],
  providers: [],
})
export class AppModule {}