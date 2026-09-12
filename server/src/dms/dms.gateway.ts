import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";

import { Server, Socket } from "socket.io";

import { DmsService } from "./dms.service";

/*
 * Realtime direct-messaging over the same Socket.IO server as channel
 * messaging. Stephen's DM service is REST-only, so this gateway bridges it:
 * rooms are named `dm:<conversationId>` and membership is verified against the
 * conversation before a client is allowed to join or broadcast.
 */
@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class DmsGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly dmsService: DmsService) {}

  @SubscribeMessage("join_dm")
  async joinDm(
    @MessageBody() body: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const conversationId = body?.conversationId;
      const accessToken = client.data.accessToken;
      const userId = client.data.userId;

      if (!accessToken || !userId) {
        return {
          event: "error",
          data: { message: "Socket authentication required." },
        };
      }

      if (!conversationId) {
        return {
          event: "error",
          data: { message: "conversationId is required." },
        };
      }

      // Throws UnauthorizedException if the caller isn't a member.
      await this.dmsService.getConversation(
        conversationId,
        accessToken,
      );

      await client.join(this.getRoomName(conversationId));

      return {
        event: "dm_joined",
        conversationId,
      };
    } catch (error) {
      return {
        event: "error",
        data: {
          message:
            error instanceof Error
              ? error.message
              : "Unable to join conversation.",
        },
      };
    }
  }

  @SubscribeMessage("leave_dm")
  async leaveDm(
    @MessageBody() body: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const conversationId = body?.conversationId;

    if (!conversationId) {
      return {
        event: "error",
        data: { message: "conversationId is required." },
      };
    }

    await client.leave(this.getRoomName(conversationId));

    return {
      event: "dm_left",
      conversationId,
    };
  }

  @SubscribeMessage("send_dm")
  async sendDm(
    @MessageBody()
    body: { conversationId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const conversationId = body?.conversationId;
      const content = body?.content;
      const accessToken = client.data.accessToken;
      const userId = client.data.userId;

      if (!accessToken || !userId) {
        return {
          event: "error",
          data: { message: "Socket authentication required." },
        };
      }

      if (!conversationId || !content?.trim()) {
        return {
          event: "error",
          data: {
            message: "conversationId and content are required.",
          },
        };
      }

      const room = this.getRoomName(conversationId);

      if (!client.rooms.has(room)) {
        return {
          event: "error",
          data: {
            message: "You must join the conversation first.",
          },
        };
      }

      const message = await this.dmsService.sendMessage(
        conversationId,
        content,
        accessToken,
      );

      const payload = {
        ...message,
        sender_name: client.data.name ?? null,
      };

      this.server.to(room).emit("new_dm", payload);

      return {
        event: "dm_sent",
        data: payload,
      };
    } catch (error) {
      return {
        event: "error",
        data: {
          message:
            error instanceof Error
              ? error.message
              : "Unable to send direct message.",
        },
      };
    }
  }

  private getRoomName(conversationId: string) {
    return `dm:${conversationId}`;
  }
}
