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

      // Join the user's personal room
      await client.join(`user:${user.id}`);

      // Get all channels the user belongs to
      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      if (membershipError) {
        throw new Error(
          membershipError.message,
        );
      }

      const channelIds: string[] =
        (memberships ?? []).map(
          (membership) =>
            membership.channel_id,
        );

      client.data.channelIds = channelIds;

      // Tell the client that authentication succeeded
      client.emit('authenticated', {
        userId: user.id,
        name,
      });

      // Tell everyone in the user's channels
      // that this user is now online
      for (const channelId of channelIds) {
        this.server
          .to(this.getRoomName(channelId))
          .emit('presence_update', {
            userId: user.id,
            status: 'online',
          });
      }
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

  async handleDisconnect(client: Socket) {
    const userId =
      client.data.userId;

    if (!userId) {
      console.log(
        `Socket disconnected: ${client.id}`,
      );

      return;
    }

    const channelIds: string[] =
      client.data.channelIds ?? [];

    // Check if the user still has another
    // active socket connected
    const remainingSockets =
      await this.server
        .in(`user:${userId}`)
        .fetchSockets();

    // Only mark the user offline when
    // their last socket disconnects
    if (remainingSockets.length === 0) {
      for (const channelId of channelIds) {
        this.server
          .to(this.getRoomName(channelId))
          .emit('presence_update', {
            userId,
            status: 'offline',
          });
      }
    }

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
          message:
            'Socket authentication required.',
        };
      }

      if (!channelId) {
        return {
          event: 'error',
          message:
            'channelId is required.',
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

      // Keep track of channels this socket has joined
      if (!client.data.channelIds) {
        client.data.channelIds = [];
      }

      if (
        !client.data.channelIds.includes(
          channelId,
        )
      ) {
        client.data.channelIds.push(
          channelId,
        );
      }

      return {
        event: 'channel_joined',
        channelId,
      };
    } catch (error) {
      return {
        event: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to join channel.',
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
        message:
          'channelId is required.',
      };
    }

    const room =
      this.getRoomName(channelId);

    await client.leave(room);

    // Remove the channel from the
    // socket's tracked channels
    client.data.channelIds =
      (
        client.data.channelIds ?? []
      ).filter(
        (id: string) =>
          id !== channelId,
      );

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

      if (!accessToken) {
        return {
          event: 'error',
          message:
            'Socket authentication required.',
        };
      }

      if (!channelId) {
        return {
          event: 'error',
          message:
            'channelId is required.',
        };
      }

      if (!content?.trim()) {
        return {
          event: 'error',
          message:
            'Message content is required.',
        };
      }

      const message =
        await this.messagesService.sendMessage(
          channelId,
          content,
          accessToken,
        );

      const messageWithReactions = {
        ...message,
        reactions: [],
      };

      this.server
        .to(this.getRoomName(channelId))
        .emit(
          'new_message',
          messageWithReactions,
        );

      return {
        event: 'message_sent',
        data: messageWithReactions,
      };
    } catch (error) {
      return {
        event: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to send message.',
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

      if (!accessToken) {
        return {
          event: 'error',
          message:
            'Socket authentication required.',
        };
      }

      if (!channelId) {
        return {
          event: 'error',
          message:
            'channelId is required.',
        };
      }

      if (!messageId) {
        return {
          event: 'error',
          message:
            'messageId is required.',
        };
      }

      if (!content?.trim()) {
        return {
          event: 'error',
          message:
            'Message content is required.',
        };
      }

      const message =
        await this.messagesService.editMessage(
          channelId,
          messageId,
          content,
          accessToken,
        );

      const messageWithReactions = {
        ...message,
        reactions: [],
      };

      this.server
        .to(this.getRoomName(channelId))
        .emit(
          'message_updated',
          messageWithReactions,
        );

      return {
        event: 'message_updated',
        data: messageWithReactions,
      };
    } catch (error) {
      return {
        event: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to edit message.',
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

      if (!accessToken) {
        return {
          event: 'error',
          message:
            'Socket authentication required.',
        };
      }

      if (!channelId) {
        return {
          event: 'error',
          message:
            'channelId is required.',
        };
      }

      if (!messageId) {
        return {
          event: 'error',
          message:
            'messageId is required.',
        };
      }

      await this.messagesService.deleteMessage(
        channelId,
        messageId,
        accessToken,
      );

      this.server
        .to(this.getRoomName(channelId))
        .emit(
          'message_deleted',
          {
            messageId,
            channelId,
          },
        );

      return {
        event: 'message_deleted',
        data: {
          messageId,
          channelId,
        },
      };
    } catch (error) {
      return {
        event: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to delete message.',
      };
    }
  }

  @SubscribeMessage('typing')
  async typing(
    @MessageBody()
    body: {
      channelId: string;
    },
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

      const name =
        client.data.name;

      if (!accessToken || !userId) {
        return {
          event: 'error',
          message:
            'Socket authentication required.',
        };
      }

      if (!channelId) {
        return {
          event: 'error',
          message:
            'channelId is required.',
        };
      }

      await this.messagesService.verifyChannelMembership(
        channelId,
        userId,
        accessToken,
      );

      client
        .to(this.getRoomName(channelId))
        .emit('user_typing', {
          userId,
          name,
          channelId,
        });

      return {
        event: 'typing_started',
        channelId,
      };
    } catch (error) {
      return {
        event: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to send typing event.',
      };
    }
  }

  @SubscribeMessage('stop_typing')
  async stopTyping(
    @MessageBody()
    body: {
      channelId: string;
    },
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

      const name =
        client.data.name;

      if (!accessToken || !userId) {
        return {
          event: 'error',
          message:
            'Socket authentication required.',
        };
      }

      if (!channelId) {
        return {
          event: 'error',
          message:
            'channelId is required.',
        };
      }

      await this.messagesService.verifyChannelMembership(
        channelId,
        userId,
        accessToken,
      );

      client
        .to(this.getRoomName(channelId))
        .emit('user_stopped_typing', {
          userId,
          name,
          channelId,
        });

      return {
        event: 'typing_stopped',
        channelId,
      };
    } catch (error) {
      return {
        event: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to send stop typing event.',
      };
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
      const channelId =
        body?.channelId;

      const messageId =
        body?.messageId;

      const emoji =
        body?.emoji;

      const accessToken =
        client.data.accessToken;

      if (!accessToken) {
        return {
          event: 'error',
          message:
            'Socket authentication required.',
        };
      }

      if (!channelId) {
        return {
          event: 'error',
          message:
            'channelId is required.',
        };
      }

      if (!messageId) {
        return {
          event: 'error',
          message:
            'messageId is required.',
        };
      }

      if (!emoji?.trim()) {
        return {
          event: 'error',
          message:
            'Emoji is required.',
        };
      }

      await this.messagesService.toggleReaction(
  channelId,
  messageId,
  emoji,
  accessToken,
);

this.server
  .to(this.getRoomName(channelId))
  .emit(
    'reaction_updated',
    {
      messageId,
      channelId,
    },
  );

return {
  event: 'reaction_updated',
  data: {
    messageId,
    channelId,
  },
};
    } catch (error) {
      return {
        event: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to toggle reaction.',
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
      client.handshake.headers.authorization;

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