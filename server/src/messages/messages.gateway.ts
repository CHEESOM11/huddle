// import {
//   ConnectedSocket,
//   MessageBody,
//   SubscribeMessage,
//   WebSocketGateway,
//   WebSocketServer,
// } from '@nestjs/websockets';

// import { Server, Socket } from 'socket.io';

// import { createClient } from '@supabase/supabase-js';

// import { MessagesService } from './messages.service';

// @WebSocketGateway({
//   cors: {
//     origin: '*',
//   },
// })
// export class MessagesGateway {
//   @WebSocketServer()
//   server!: Server;

//   constructor(
//     private readonly messagesService: MessagesService,
//   ) {}

//   async handleConnection(client: Socket) {
//     try {
//       const token = this.extractToken(client);

//       if (!token) {
//         client.emit('error', {
//           message:
//             'Authentication token is required.',
//         });

//         client.disconnect();

//         return;
//       }

//       const supabase = createClient(
//         process.env.SUPABASE_URL!,
//         process.env.SUPABASE_PUBLISHABLE_KEY!,
//         {
//           global: {
//             headers: {
//               Authorization: `Bearer ${token}`,
//             },
//           },
//           auth: {
//             autoRefreshToken: false,
//             persistSession: false,
//             detectSessionInUrl: false,
//           },
//         },
//       );

//       const {
//         data: { user },
//         error,
//       } = await supabase.auth.getUser();

//       if (error || !user) {
//         client.emit('error', {
//           message:
//             'Invalid or expired authentication token.',
//         });

//         client.disconnect();

//         return;
//       }

//       const name =
//         user.user_metadata?.name ??
//         user.user_metadata?.full_name ??
//         user.email ??
//         'Someone';

//       client.data.accessToken = token;
//       client.data.userId = user.id;
//       client.data.name = name;

//       client.emit('authenticated', {
//         userId: user.id,
//         name,
//       });
//     } catch (error) {
//       client.emit('error', {
//         message:
//           error instanceof Error
//             ? error.message
//             : 'Socket authentication failed.',
//       });

//       client.disconnect();
//     }
//   }

//   handleDisconnect(client: Socket) {
//     console.log(
//       `Socket disconnected: ${client.id}`,
//     );
//   }

//   @SubscribeMessage('join_channel')
//   async joinChannel(
//     @MessageBody()
//     body: { channelId: string },
//     @ConnectedSocket()
//     client: Socket,
//   ) {
//     try {
//       const channelId = body?.channelId;
//       const accessToken =
//         client.data.accessToken;
//       const userId = client.data.userId;

//       if (!accessToken || !userId) {
//         return {
//           event: 'error',
//           message:
//             'Socket authentication required.',
//         };
//       }

//       if (!channelId) {
//         return {
//           event: 'error',
//           message: 'channelId is required.',
//         };
//       }

//       await this.messagesService.verifyChannelMembership(
//         channelId,
//         userId,
//         accessToken,
//       );

//       const room =
//         this.getRoomName(channelId);

//       await client.join(room);

//       return {
//         event: 'channel_joined',
//         channelId,
//       };
//     } catch (error) {
//       return {
//         event: 'error',
//         message:
//           error instanceof Error
//             ? error.message
//             : 'Unable to join channel.',
//       };
//     }
//   }

//   @SubscribeMessage('leave_channel')
//   async leaveChannel(
//     @MessageBody()
//     body: { channelId: string },
//     @ConnectedSocket()
//     client: Socket,
//   ) {
//     const channelId = body?.channelId;

//     if (!channelId) {
//       return {
//         event: 'error',
//         message: 'channelId is required.',
//       };
//     }

//     const room =
//       this.getRoomName(channelId);

//     await client.leave(room);

//     return {
//       event: 'channel_left',
//       channelId,
//     };
//   }

//   @SubscribeMessage('send_message')
//   async sendMessage(
//     @MessageBody()
//     body: {
//       channelId: string;
//       content: string;
//     },
//     @ConnectedSocket()
//     client: Socket,
//   ) {
//     try {
//       const channelId = body?.channelId;
//       const content = body?.content;

//       const accessToken =
//         client.data.accessToken;

//       const userId = client.data.userId;

//       if (!accessToken || !userId) {
//         return {
//           event: 'error',
//           message:
//             'Socket authentication required.',
//         };
//       }

//       if (!channelId || !content?.trim()) {
//         return {
//           event: 'error',
//           message:
//             'channelId and content are required.',
//         };
//       }

//       const room =
//         this.getRoomName(channelId);

//       if (!client.rooms.has(room)) {
//         return {
//           event: 'error',
//           message:
//             'You must join the channel first.',
//         };
//       }

//       const message =
//         await this.messagesService.sendMessage(
//           channelId,
//           content,
//           accessToken,
//         );

//       this.server
//         .to(room)
//         .emit('new_message', {
//           ...message,
//           reactions: [],
//         });

//       return {
//         event: 'message_sent',
//         data: {
//           ...message,
//           reactions: [],
//         },
//       };
//     } catch (error) {
//       return {
//         event: 'error',
//         message:
//           error instanceof Error
//             ? error.message
//             : 'Unable to send message.',
//       };
//     }
//   }

//   @SubscribeMessage('typing')
//   async typing(
//     @MessageBody()
//     body: { channelId: string },
//     @ConnectedSocket()
//     client: Socket,
//   ) {
//     const channelId = body?.channelId;
//     const room =
//       this.getRoomName(channelId);

//     if (
//       channelId &&
//       client.rooms.has(room)
//     ) {
//       client.to(room).emit(
//         'user_typing',
//         {
//           userId: client.data.userId,
//           name: client.data.name,
//         },
//       );
//     }
//   }

//   @SubscribeMessage('stop_typing')
//   async stopTyping(
//     @MessageBody()
//     body: { channelId: string },
//     @ConnectedSocket()
//     client: Socket,
//   ) {
//     const channelId = body?.channelId;
//     const room =
//       this.getRoomName(channelId);

//     if (
//       channelId &&
//       client.rooms.has(room)
//     ) {
//       client.to(room).emit(
//         'user_stopped_typing',
//         {
//           userId: client.data.userId,
//         },
//       );
//     }
//   }

//   @SubscribeMessage('toggle_reaction')
//   async toggleReaction(
//     @MessageBody()
//     body: {
//       channelId: string;
//       messageId: string;
//       emoji: string;
//     },
//     @ConnectedSocket()
//     client: Socket,
//   ) {
//     try {
//       const {
//         channelId,
//         messageId,
//         emoji,
//       } = body ?? {};

//       const accessToken =
//         client.data.accessToken;

//       const userId =
//         client.data.userId;

//       if (!accessToken || !userId) {
//         return {
//           event: 'error',
//           message:
//             'Socket authentication required.',
//         };
//       }

//       if (
//         !channelId ||
//         !messageId ||
//         !emoji
//       ) {
//         return {
//           event: 'error',
//           message:
//             'channelId, messageId, and emoji are required.',
//         };
//       }

//       const room =
//         this.getRoomName(channelId);

//       if (!client.rooms.has(room)) {
//         return {
//           event: 'error',
//           message:
//             'You must join the channel first.',
//         };
//       }

//       await this.messagesService.verifyChannelMembership(
//         channelId,
//         userId,
//         accessToken,
//       );

//       /*
//        * Make sure the message actually
//        * belongs to this channel.
//        */
//       const reactionsMessageCheck =
//         await this.messagesService.getMessages(
//           channelId,
//           accessToken,
//         );

//       const messageExists =
//         reactionsMessageCheck.some(
//           (message) =>
//             message.id === messageId,
//         );

//       if (!messageExists) {
//         return {
//           event: 'error',
//           message:
//             'Message does not belong to this channel.',
//         };
//       }

//       await this.messagesService.toggleReaction(
//         messageId,
//         emoji,
//         userId,
//         accessToken,
//       );

//       const reactionsMap =
//         await this.messagesService.getReactions(
//           [messageId],
//           accessToken,
//         );

//       const reactions =
//         reactionsMap.get(messageId) ?? [];

//       this.server
//         .to(room)
//         .emit(
//           'reaction_updated',
//           {
//             messageId,
//             reactions,
//           },
//         );

//       return {
//         event: 'reaction_toggled',
//         messageId,
//         reactions,
//       };
//     } catch (error) {
//       return {
//         event: 'error',
//         message:
//           error instanceof Error
//             ? error.message
//             : 'Unable to toggle reaction.',
//       };
//     }
//   }

//   private extractToken(
//     client: Socket,
//   ): string | null {
//     const authToken =
//       client.handshake.auth?.token;

//     if (authToken) {
//       return authToken.replace(
//         /^Bearer\s+/i,
//         '',
//       );
//     }

//     const authorization =
//       client.handshake.headers
//         .authorization;

//     if (authorization) {
//       return authorization.replace(
//         /^Bearer\s+/i,
//         '',
//       );
//     }

//     return null;
//   }

//   private getRoomName(
//     channelId: string,
//   ) {
//     return `channel:${channelId}`;
//   }
// }


import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import {
  Server,
  Socket,
} from 'socket.io';

import { createClient } from '@supabase/supabase-js';

import { MessagesService } from './messages.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagesGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly messagesService: MessagesService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        this.extractToken(client);

      if (!token) {
        client.emit('error', {
          message:
            'Authentication token is required.',
        });

        client.disconnect();

        return;
      }

      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_PUBLISHABLE_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
        },
      );

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        client.emit('error', {
          message:
            'Invalid or expired authentication token.',
        });

        client.disconnect();

        return;
      }

      const name =
        user.user_metadata?.name ??
        user.user_metadata?.full_name ??
        user.email ??
        'Someone';

      client.data.accessToken = token;
      client.data.userId = user.id;
      client.data.name = name;

      client.emit('authenticated', {
        userId: user.id,
        name,
      });
    } catch (error) {
      client.emit('error', {
        message:
          error instanceof Error
            ? error.message
            : 'Socket authentication failed.',
      });

      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(
      `Socket disconnected: ${client.id}`,
    );
  }

  @SubscribeMessage('join_channel')
  async joinChannel(
    @MessageBody()
    body: { channelId: string },
    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const channelId =
        body?.channelId;

      const accessToken =
        client.data.accessToken;

      const userId =
        client.data.userId;

      if (!accessToken || !userId) {
        return {
          event: 'error',
          data: { message: 'Socket authentication required.' },
        };
      }

      if (!channelId) {
        return {
          event: 'error',
          data: { message: 'channelId is required.' },
        };
      }

      await this.messagesService.verifyChannelMembership(
        channelId,
        userId,
        accessToken,
      );

      const room =
        this.getRoomName(channelId);

      await client.join(room);

      return {
        event: 'channel_joined',
        channelId,
      };
    } catch (error) {
      return {
        event: 'error',
        data: { message: error instanceof Error ? error.message : 'Unable to join channel.' },
      };
    }
  }

  @SubscribeMessage('leave_channel')
  async leaveChannel(
    @MessageBody()
    body: { channelId: string },
    @ConnectedSocket()
    client: Socket,
  ) {
    const channelId =
      body?.channelId;

    if (!channelId) {
      return {
        event: 'error',
        data: { message: 'channelId is required.' },
      };
    }

    const room =
      this.getRoomName(channelId);

    await client.leave(room);

    return {
      event: 'channel_left',
      channelId,
    };
  }

  @SubscribeMessage('send_message')
  async sendMessage(
    @MessageBody()
    body: {
      channelId: string;
      content: string;
      filePath?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    },
    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const channelId =
        body?.channelId;

      const content =
        body?.content;

      const accessToken =
        client.data.accessToken;

      const userId =
        client.data.userId;

      if (!accessToken || !userId) {
        return {
          event: 'error',
          data: { message: 'Socket authentication required.' },
        };
      }

      if (
        !channelId ||
        (!content?.trim() && !body?.filePath)
      ) {
        return {
          event: 'error',
          data: { message: 'channelId and content (or a file) are required.' },
        };
      }

      const room =
        this.getRoomName(channelId);

      if (!client.rooms.has(room)) {
        return {
          event: 'error',
          data: { message: 'You must join the channel first.' },
        };
      }

      const message =
        await this.messagesService.sendMessage(
          channelId,
          content,
          accessToken,
          body?.filePath,
          body?.fileName,
          body?.fileType,
          body?.fileSize,
        );

      this.server
        .to(room)
        .emit('new_message', {
          ...message,
          reactions: [],
        });

      return {
        event: 'message_sent',
        data: {
          ...message,
          reactions: [],
        },
      };
    } catch (error) {
      return {
        event: 'error',
        data: { message: error instanceof Error ? error.message : 'Unable to send message.' },
      };
    }
  }

  @SubscribeMessage('edit_message')
  async editMessage(
    @MessageBody()
    body: {
      channelId: string;
      messageId: string;
      content: string;
    },
    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const channelId =
        body?.channelId;

      const messageId =
        body?.messageId;

      const content =
        body?.content;

      const accessToken =
        client.data.accessToken;

      const userId =
        client.data.userId;

      if (!accessToken || !userId) {
        return {
          event: 'error',
          data: { message: 'Socket authentication required.' },
        };
      }

      if (
        !channelId ||
        !messageId ||
        !content?.trim()
      ) {
        return {
          event: 'error',
          data: { message: 'channelId, messageId, and content are required.' },
        };
      }

      const room =
        this.getRoomName(channelId);

      if (!client.rooms.has(room)) {
        return {
          event: 'error',
          data: { message: 'You must join the channel first.' },
        };
      }

      const message =
        await this.messagesService.editMessage(
          channelId,
          messageId,
          content,
          accessToken,
        );

      this.server
        .to(room)
        .emit('message_edited', {
          ...message,
          reactions: [],
        });

      return {
        event: 'message_edited',
        data: {
          ...message,
          reactions: [],
        },
      };
    } catch (error) {
      return {
        event: 'error',
        data: { message: error instanceof Error ? error.message : 'Unable to edit message.' },
      };
    }
  }

  @SubscribeMessage('delete_message')
  async deleteMessage(
    @MessageBody()
    body: {
      channelId: string;
      messageId: string;
    },
    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const channelId =
        body?.channelId;

      const messageId =
        body?.messageId;

      const accessToken =
        client.data.accessToken;

      const userId =
        client.data.userId;

      if (!accessToken || !userId) {
        return {
          event: 'error',
          data: { message: 'Socket authentication required.' },
        };
      }

      if (!channelId || !messageId) {
        return {
          event: 'error',
          data: { message: 'channelId and messageId are required.' },
        };
      }

      const room =
        this.getRoomName(channelId);

      if (!client.rooms.has(room)) {
        return {
          event: 'error',
          data: { message: 'You must join the channel first.' },
        };
      }

      await this.messagesService.deleteMessage(
        channelId,
        messageId,
        accessToken,
      );

      this.server
        .to(room)
        .emit('message_deleted', {
          messageId,
          channelId,
        });

      return {
        event: 'message_deleted',
        messageId,
        channelId,
      };
    } catch (error) {
      return {
        event: 'error',
        data: { message: error instanceof Error ? error.message : 'Unable to delete message.' },
      };
    }
  }

  @SubscribeMessage('typing')
  async typing(
    @MessageBody()
    body: { channelId: string },
    @ConnectedSocket()
    client: Socket,
  ) {
    const channelId =
      body?.channelId;

    const room =
      this.getRoomName(channelId);

    if (
      channelId &&
      client.rooms.has(room)
    ) {
      client.to(room).emit(
        'user_typing',
        {
          userId:
            client.data.userId,
          name:
            client.data.name,
        },
      );
    }
  }

  @SubscribeMessage('stop_typing')
  async stopTyping(
    @MessageBody()
    body: { channelId: string },
    @ConnectedSocket()
    client: Socket,
  ) {
    const channelId =
      body?.channelId;

    const room =
      this.getRoomName(channelId);

    if (
      channelId &&
      client.rooms.has(room)
    ) {
      client.to(room).emit(
        'user_stopped_typing',
        {
          userId:
            client.data.userId,
        },
      );
    }
  }

  @SubscribeMessage('toggle_reaction')
  async toggleReaction(
    @MessageBody()
    body: {
      channelId: string;
      messageId: string;
      emoji: string;
    },
    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const {
        channelId,
        messageId,
        emoji,
      } = body ?? {};

      const accessToken =
        client.data.accessToken;

      const userId =
        client.data.userId;

      if (!accessToken || !userId) {
        return {
          event: 'error',
          data: { message: 'Socket authentication required.' },
        };
      }

      if (
        !channelId ||
        !messageId ||
        !emoji
      ) {
        return {
          event: 'error',
          data: { message: 'channelId, messageId, and emoji are required.' },
        };
      }

      const room =
        this.getRoomName(channelId);

      if (!client.rooms.has(room)) {
        return {
          event: 'error',
          data: { message: 'You must join the channel first.' },
        };
      }

      await this.messagesService.verifyChannelMembership(
        channelId,
        userId,
        accessToken,
      );

      const reactionsMessageCheck =
        await this.messagesService.getMessages(
          channelId,
          accessToken,
        );

      const messageExists =
        reactionsMessageCheck.some(
          (message) =>
            message.id === messageId,
        );

      if (!messageExists) {
        return {
          event: 'error',
          data: { message: 'Message does not belong to this channel.' },
        };
      }

      await this.messagesService.toggleReaction(
        messageId,
        emoji,
        userId,
        accessToken,
      );

      const reactionsMap =
        await this.messagesService.getReactions(
          [messageId],
          accessToken,
        );

      const reactions =
        reactionsMap.get(messageId) ?? [];

      this.server
        .to(room)
        .emit(
          'reaction_updated',
          {
            messageId,
            reactions,
          },
        );

      return {
        event: 'reaction_toggled',
        messageId,
        reactions,
      };
    } catch (error) {
      return {
        event: 'error',
        data: { message: error instanceof Error ? error.message : 'Unable to toggle reaction.' },
      };
    }
  }

  private extractToken(
    client: Socket,
  ): string | null {
    const authToken =
      client.handshake.auth?.token;

    if (authToken) {
      return authToken.replace(
        /^Bearer\s+/i,
        '',
      );
    }

    const authorization =
      client.handshake.headers
        .authorization;

    if (authorization) {
      return authorization.replace(
        /^Bearer\s+/i,
        '',
      );
    }

    return null;
  }

  private getRoomName(
    channelId: string,
  ) {
    return `channel:${channelId}`;
  }
}