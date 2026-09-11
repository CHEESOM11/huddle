import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

@Injectable()
export class MessagesService {
  /**
   * Creates a Supabase client using the authenticated
   * user's access token.
   * This means Supabase RLS remains active.
   */
  private getAuthenticatedClient(accessToken: string): SupabaseClient {
    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      },
    );
  }

  /**
   * Validate the access token and return the user.
   */
  async getAuthenticatedUser(accessToken: string): Promise<User> {
    if (!accessToken) {
      throw new UnauthorizedException("Authorization token is required.");
    }

    const supabase = this.getAuthenticatedClient(accessToken);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      throw new UnauthorizedException(
        "Invalid or expired authorization token.",
      );
    }

    return user;
  }

  /**
   * Verify that a channel exists.
   */
  async verifyChannelExists(channelId: string, accessToken: string) {
    if (!channelId) {
      throw new BadRequestException("Channel ID is required.");
    }

    const supabase = this.getAuthenticatedClient(accessToken);

    const { data: channel, error } = await supabase
      .from("channels")
      .select("id, name, created_by, created_at")
      .eq("id", channelId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!channel) {
      throw new NotFoundException("Channel not found.");
    }

    return channel;
  }

  // Verify that a user belongs to a channel.
  async verifyChannelMembership(
    channelId: string,
    userId: string,
    accessToken: string,
  ) {
    const supabase = this.getAuthenticatedClient(accessToken);

    const { data: membership, error } = await supabase
      .from("channel_members")
      .select("channel_id, user_id")
      .eq("channel_id", channelId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!membership) {
      throw new UnauthorizedException(
        "You must join this channel before accessing its messages.",
      );
    }

    return membership;
  }

  /* Send a message.
   * This method is used by BOTH:
   * REST API
   * Socket.IO Gateway
   */
  async sendMessage(channelId: string, content: string, accessToken: string) {
    if (!channelId) {
      throw new BadRequestException("Channel ID is required.");
    }

    if (!content || !content.trim()) {
      throw new BadRequestException("Message content cannot be empty.");
    }

    // Authenticate user.
    const user = await this.getAuthenticatedUser(accessToken);

    // Verify channel.
    await this.verifyChannelExists(channelId, accessToken);

    // Verify membership.
    await this.verifyChannelMembership(channelId, user.id, accessToken);

    const supabase = this.getAuthenticatedClient(accessToken);

    // Insert into EXISTING messages table.
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        channel_id: channelId,
        user_id: user.id,
        content: content.trim(),
      })
      .select("id, channel_id, user_id, content, created_at")
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return message;
  }

  /**
   * Get messages for a channel.
   */
  async getMessages(channelId: string, accessToken: string) {
    if (!channelId) {
      throw new BadRequestException("Channel ID is required.");
    }

    // Authenticate.
    const user = await this.getAuthenticatedUser(accessToken);

    // Verify channel exists.
    await this.verifyChannelExists(channelId, accessToken);

    // Verify membership.
    await this.verifyChannelMembership(channelId, user.id, accessToken);

    const supabase = this.getAuthenticatedClient(accessToken);

    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, channel_id, user_id, content, created_at")
      .eq("channel_id", channelId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return messages;
  }
}
