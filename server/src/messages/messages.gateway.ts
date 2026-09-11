import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";

import { Server, Socket } from "socket.io";

import { MessagesService } from "./messages.service";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class MessagesGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly messagesService: MessagesService) {}

  /**
   * Authenticate a Socket.IO connection.
   * The frontend should send:
   * auth: {
   *   token: "USER_ACCESS_TOKEN"
   * }
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        client.emit("auth_error", {
          message: "Authorization token is required.",
        });

        client.disconnect();

        return;
      }

      const user = await this.messagesService.getAuthenticatedUser(token);

      // Store authentication information
      // on the socket for later events.
      client.data.accessToken = token;
      client.data.userId = user.id;

      client.emit("authenticated", {
        userId: user.id,
      });

      console.log(`Socket authenticated: ${user.id}`);
    } catch (error) {
      client.emit("auth_error", {
        message:
          error instanceof Error ? error.message : "Authentication failed.",
      });

      client.disconnect();
    }
  }

  // Disconnect handler.

  handleDisconnect(client: Socket) {
    console.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage("join_channel")
  async joinChannel(
    @MessageBody()
    body: {
      channelId: string;
    },

    @ConnectedSocket()
    client: Socket,
  ) {
    try {
      const channelId = body?.channelId;

      const accessToken = client.data.accessToken;

      const userId = client.data.userId;

      if (!channelId) {
        return {
          event: "error",
          message: "Channel ID is required.",
        };
      }

      if (!accessToken || !userId) {
        return {
          event: "error",
          message: "Socket authentication required.",
        };
      }

      // Verify channel exists.
      await this.messagesService.verifyChannelExists(channelId, accessToken);

      // Verify user belongs to channel.
      await this.messagesService.verifyChannelMembership(
        channelId,
        userId,
        accessToken,
      );

      // Add socket to the channel room.
      await client.join(this.getRoomName(channelId));

      client.data.channelId = channelId;

      return {
        event: "channel_joined",
        channelId,
      };
    } catch (error) {
      return {
        event: "error",
        message:
          error instanceof Error ? error.message : "Unable to join channel.",
      };
    }
  }

  // Leave a channel room.
  @SubscribeMessage("leave_channel")
  async leaveChannel(
    @MessageBody()
    body: {
      channelId: string;
    },

    @ConnectedSocket()
    client: Socket,
  ) {
    const channelId = body?.channelId;

    if (!channelId) {
      return {
        event: "error",
        message: "Channel ID is required.",
      };
    }

    await client.leave(this.getRoomName(channelId));

    if (client.data.channelId === channelId) {
      client.data.channelId = undefined;
    }

    return {
      event: "channel_left",
      channelId,
    };
  }

  // Send a real-time message.
  @SubscribeMessage("send_message")
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
      const channelId = body?.channelId;

      const content = body?.content;

      const accessToken = client.data.accessToken;

      if (!accessToken) {
        return {
          event: "message_error",
          message: "Socket authentication required.",
        };
      }

      if (!channelId) {
        return {
          event: "message_error",
          message: "Channel ID is required.",
        };
      }

      if (!content || !content.trim()) {
        return {
          event: "message_error",
          message: "Message content cannot be empty.",
        };
      }

      // Make sure this socket has joined
      // the requested channel room.
      const room = this.getRoomName(channelId);

      if (!client.rooms.has(room)) {
        return {
          event: "message_error",
          message: "You must join this channel before sending messages.",
        };
      }

      // Save to Supabase.
      const message = await this.messagesService.sendMessage(
        channelId,
        content,
        accessToken,
      );

      // Broadcast to everyone inside this channel.
      this.server.to(room).emit("new_message", message);

      return {
        event: "message_sent",
        data: message,
      };
    } catch (error) {
      return {
        event: "message_error",
        message:
          error instanceof Error ? error.message : "Unable to send message.",
      };
    }
  }

  /**
   * Extract the access token from
   * the Socket.IO handshake.
   */
  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === "string") {
      return authToken.replace(/^Bearer\s+/i, "");
    }

    const authorization = client.handshake.headers.authorization;

    if (typeof authorization === "string") {
      return authorization.replace(/^Bearer\s+/i, "");
    }

    return null;
  }

  // Prevent room-name collisions.

  private getRoomName(channelId: string): string {
    return `channel:${channelId}`;
  }
}
