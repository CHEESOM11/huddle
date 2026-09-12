import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  createClient,
  SupabaseClient,
} from '@supabase/supabase-js';

import { getProfileNames } from '../config/profiles';

@Injectable()
export class MessagesService {
  private getNameFromUser(user: any): string | null {
    const meta = user?.user_metadata ?? {};
    return (
      meta?.name ??
      meta?.full_name ??
      user?.email ??
      null
    );
  }

  private getAuthenticatedClient(
    accessToken: string,
  ): SupabaseClient {
    if (!accessToken) {
      throw new UnauthorizedException(
        'Authentication token is required.',
      );
    }

    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  private async getAuthenticatedUser(
    accessToken: string,
  ) {
    const authenticatedSupabase =
      this.getAuthenticatedClient(accessToken);

    const {
      data: { user },
      error,
    } = await authenticatedSupabase.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedException(
        'Invalid or expired authentication token.',
      );
    }

    return user;
  }

  private async verifyChannelExists(
    channelId: string,
    accessToken: string,
  ) {
    const authenticatedSupabase =
      this.getAuthenticatedClient(accessToken);

    const { data, error } =
      await authenticatedSupabase
        .from('channels')
        .select('id')
        .eq('id', channelId)
        .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new BadRequestException(
        'Channel does not exist.',
      );
    }

    return data;
  }

  async verifyChannelMembership(
    channelId: string,
    userId: string,
    accessToken: string,
  ) {
    const authenticatedSupabase =
      this.getAuthenticatedClient(accessToken);

    const { data, error } =
      await authenticatedSupabase
        .from('channel_members')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new UnauthorizedException(
        'You are not a member of this channel.',
      );
    }

    return data;
  }

  // Lightweight existence check: is `messageId` a message in `channelId`?
  // Used by the reaction gateway so it doesn't have to load every message
  // (and its reactions + sender names) just to validate a single id.
  async messageBelongsToChannel(
    channelId: string,
    messageId: string,
    accessToken: string,
  ): Promise<boolean> {
    const authenticatedSupabase =
      this.getAuthenticatedClient(accessToken);

    const { data, error } = await authenticatedSupabase
      .from('messages')
      .select('id')
      .eq('id', messageId)
      .eq('channel_id', channelId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return Boolean(data);
  }

  async sendMessage(
    channelId: string,
    content: string,
    accessToken: string,
    filePath?: string,
    fileName?: string,
    fileType?: string,
    fileSize?: number,
    sender?: { userId: string; name: string | null },
  ) {
    if (!content?.trim() && !filePath) {
      throw new BadRequestException(
        'Message content or file is required.',
      );
    }

    // The socket gateway already authenticated the caller on connect, so it
    // passes `sender` in to skip a redundant `auth.getUser` round trip. The
    // REST path authenticates normally.
    const user = sender
      ? { id: sender.userId }
      : await this.getAuthenticatedUser(accessToken);

    // Membership implies the channel exists (channel_members.channel_id is a
    // foreign key), so this single check replaces the old
    // verifyChannelExists + verifyChannelMembership pair and saves a round trip.
    await this.verifyChannelMembership(
      channelId,
      user.id,
      accessToken,
    );

    const authenticatedSupabase =
      this.getAuthenticatedClient(accessToken);

    const { data, error } = await authenticatedSupabase
      .from('messages')
      .insert({
        channel_id: channelId,
        user_id: user.id,
        // `content` is NOT NULL in the DB, so a file-only message (no text)
        // must store an empty string rather than NULL or the insert is
        // rejected with "null value in column content".
        content: content?.trim() || "",
        file_path: filePath || null,
        file_name: fileName || null,
        file_type: fileType || null,
        file_size: fileSize || null,
      })
      .select(
        'id, channel_id, user_id, content, file_path, file_name, file_type, file_size, created_at, parent_id',
      )
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      ...data,
      sender_name:
        sender?.name ?? this.getNameFromUser(user),
    };
  }

  async getMessages(
    channelId: string,
    accessToken: string,
  ) {
    if (!channelId) {
      throw new BadRequestException(
        'Channel ID is required.',
      );
    }

    const user =
      await this.getAuthenticatedUser(accessToken);

    await this.verifyChannelExists(
      channelId,
      accessToken,
    );

    await this.verifyChannelMembership(
      channelId,
      user.id,
      accessToken,
    );

    const authenticatedSupabase =
      this.getAuthenticatedClient(accessToken);

    const { data: messages, error } =
      await authenticatedSupabase
        .from('messages')
        .select(
          'id, channel_id, user_id, content, file_path, file_name, file_type, file_size, created_at, parent_id',
        )
        .eq('channel_id', channelId)
        .order('created_at', {
          ascending: true,
        });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const messageIds =
      (messages ?? []).map(
        (message) => message.id,
      );

    const reactionsMap =
      await this.getReactions(
        messageIds,
        accessToken,
      );

    const enriched = (messages ?? []).map(
      (message) => ({
        ...message,
        reactions:
          reactionsMap.get(message.id) ?? [],
      }),
    );

    const senderNames = await getProfileNames(
      authenticatedSupabase,
      enriched.map((message) => message.user_id),
    );

    return enriched.map((message) => ({
      ...message,
      sender_name:
        senderNames.get(message.user_id) ?? null,
    }));
  }

  async editMessage(
    channelId: string,
    messageId: string,
    content: string,
    accessToken: string,
  ) {
    if (!channelId || !messageId) {
      throw new BadRequestException(
        'Channel ID and message ID are required.',
      );
    }

    if (!content?.trim()) {
      throw new BadRequestException(
        'Message content cannot be empty.',
      );
    }

    const user =
      await this.getAuthenticatedUser(accessToken);

    await this.verifyChannelExists(
      channelId,
      accessToken,
    );

    await this.verifyChannelMembership(
      channelId,
      user.id,
      accessToken,
    );

    const authenticatedSupabase =
      this.getAuthenticatedClient(accessToken);

    const {
      data: existingMessage,
      error: findError,
    } = await authenticatedSupabase
      .from('messages')
      .select(
        'id, channel_id, user_id, content, created_at, parent_id',
      )
      .eq('id', messageId)
      .eq('channel_id', channelId)
      .maybeSingle();

    if (findError) {
      throw new BadRequestException(
        findError.message,
      );
    }

    if (!existingMessage) {
      throw new NotFoundException(
        'Message not found.',
      );
    }

    if (existingMessage.user_id !== user.id) {
      throw new ForbiddenException(
        'You can only edit your own messages.',
      );
    }

    const {
      data: updatedMessage,
      error: updateError,
    } = await authenticatedSupabase
      .from('messages')
      .update({
        content: content.trim(),
      })
      .eq('id', messageId)
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .select(
        'id, channel_id, user_id, content, created_at, parent_id',
      )
      .single();

    if (updateError || !updatedMessage) {
      throw new BadRequestException(
        updateError?.message ??
          'Failed to update message.',
      );
    }

    return {
      ...updatedMessage,
      sender_name: this.getNameFromUser(user),
    };
  }

  async deleteMessage(
    channelId: string,
    messageId: string,
    accessToken: string,
  ) {
    if (!channelId || !messageId) {
      throw new BadRequestException(
        'Channel ID and message ID are required.',
      );
    }

    const user =
      await this.getAuthenticatedUser(accessToken);

    await this.verifyChannelExists(
      channelId,
      accessToken,
    );

    await this.verifyChannelMembership(
      channelId,
      user.id,
      accessToken,
    );

    const authenticatedSupabase =
      this.getAuthenticatedClient(accessToken);

    const {
      data: existingMessage,
      error: findError,
    } = await authenticatedSupabase
      .from('messages')
      .select(
        'id, channel_id, user_id',
      )
      .eq('id', messageId)
      .eq('channel_id', channelId)
      .maybeSingle();

    if (findError) {
      throw new BadRequestException(
        findError.message,
      );
    }

    if (!existingMessage) {
      throw new NotFoundException(
        'Message not found.',
      );
    }

    if (existingMessage.user_id !== user.id) {
      throw new ForbiddenException(
        'You can only delete your own messages.',
      );
    }

    const { error: deleteError } =
      await authenticatedSupabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

    if (deleteError) {
      throw new BadRequestException(
        deleteError.message,
      );
    }

    return {
      message: 'Message deleted successfully.',
      data: {
        id: messageId,
        channelId,
      },
    };
  }

  async getReactions(
    messageIds: string[],
    accessToken: string,
  ) {
    const map = new Map<
      string,
      {
        emoji: string;
        count: number;
        users: string[];
      }[]
    >();

    if (messageIds.length === 0) {
      return map;
    }

    const authenticatedSupabase =
      this.getAuthenticatedClient(accessToken);

    const { data, error } =
      await authenticatedSupabase
        .from('message_reactions')
        .select(
          'message_id, emoji, user_id',
        )
        .in('message_id', messageIds);

    if (error) {
      throw new BadRequestException(
        error.message,
      );
    }

    for (const row of data ?? []) {
      const list =
        map.get(row.message_id) ?? [];

      let entry = list.find(
        (reaction) =>
          reaction.emoji === row.emoji,
      );

      if (!entry) {
        entry = {
          emoji: row.emoji,
          count: 0,
          users: [],
        };

        list.push(entry);
      }

      entry.count += 1;
      entry.users.push(row.user_id);

      map.set(row.message_id, list);
    }

    return map;
  }

  async toggleReaction(
    messageId: string,
    emoji: string,
    userId: string,
    accessToken: string,
  ) {
    if (!messageId || !emoji || !userId) {
      throw new BadRequestException(
        'Message ID, emoji, and user ID are required.',
      );
    }

    const authenticatedSupabase =
      this.getAuthenticatedClient(accessToken);

    const {
      data: existing,
      error: findError,
    } =
      await authenticatedSupabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .maybeSingle();

    if (findError) {
      throw new BadRequestException(
        findError.message,
      );
    }

    if (existing) {
      const { error: deleteError } =
        await authenticatedSupabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id);

      if (deleteError) {
        throw new BadRequestException(
          deleteError.message,
        );
      }

      return;
    }

    const { error: insertError } =
      await authenticatedSupabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: userId,
          emoji,
        });

    if (insertError) {
      throw new BadRequestException(
        insertError.message,
      );
    }
  }

  async getReplies(
    messageId: string,
    accessToken: string,
  ) {
    if (!messageId) {
      throw new BadRequestException(
        'Message ID is required.',
      );
    }

    const user =
      await this.getAuthenticatedUser(accessToken);

    const authenticatedSupabase =
      this.getAuthenticatedClient(accessToken);

    const {
      data: parentMessage,
      error: parentError,
    } =
      await authenticatedSupabase
        .from('messages')
        .select('id, channel_id')
        .eq('id', messageId)
        .maybeSingle();

    if (parentError) {
      throw new BadRequestException(
        parentError.message,
      );
    }

    if (!parentMessage) {
      throw new NotFoundException(
        'Message not found.',
      );
    }

    await this.verifyChannelMembership(
      parentMessage.channel_id,
      user.id,
      accessToken,
    );

    const {
      data: replies,
      error: repliesError,
    } =
      await authenticatedSupabase
        .from('messages')
        .select(
          'id, channel_id, user_id, content, created_at, parent_id',
        )
        .eq('parent_id', messageId)
        .order('created_at', {
          ascending: true,
        });

    if (repliesError) {
      throw new BadRequestException(
        repliesError.message,
      );
    }

    const replyIds =
      (replies ?? []).map(
        (reply) => reply.id,
      );

    const reactionsMap =
      await this.getReactions(
        replyIds,
        accessToken,
      );

    const senderNames =
      await getProfileNames(
        authenticatedSupabase,
        (replies ?? []).map(
          (reply) => reply.user_id,
        ),
      );

    return (replies ?? []).map(
      (reply) => ({
        ...reply,
        reactions:
          reactionsMap.get(reply.id) ?? [],
        sender_name:
          senderNames.get(reply.user_id) ?? null,
      }),
    );
  }

  async createReply(
    messageId: string,
    content: string,
    accessToken: string,
    sender?: { userId: string; name: string | null },
  ) {
    if (!messageId) {
      throw new BadRequestException(
        'Message ID is required.',
      );
    }

    if (!content?.trim()) {
      throw new BadRequestException(
        'Reply content cannot be empty.',
      );
    }

    // The socket gateway already authenticated the caller on connect, so it
    // passes `sender` in to skip a redundant `auth.getUser` round trip.
    const user = sender
      ? { id: sender.userId }
      : await this.getAuthenticatedUser(accessToken);

    const authenticatedSupabase =
      this.getAuthenticatedClient(accessToken);

    const {
      data: parentMessage,
      error: parentError,
    } =
      await authenticatedSupabase
        .from('messages')
        .select('id, channel_id')
        .eq('id', messageId)
        .maybeSingle();

    if (parentError) {
      throw new BadRequestException(
        parentError.message,
      );
    }

    if (!parentMessage) {
      throw new NotFoundException(
        'Message not found.',
      );
    }

    await this.verifyChannelMembership(
      parentMessage.channel_id,
      user.id,
      accessToken,
    );

    const {
      data: reply,
      error: replyError,
    } =
      await authenticatedSupabase
        .from('messages')
        .insert({
          channel_id:
            parentMessage.channel_id,
          user_id: user.id,
          content: content.trim(),
          parent_id: messageId,
        })
        .select(
          'id, channel_id, user_id, content, created_at, parent_id',
        )
        .single();

    if (replyError || !reply) {
      throw new BadRequestException(
        replyError?.message ??
          'Failed to create reply.',
      );
    }

    return {
      ...reply,
      reactions: [],
      sender_name:
        sender?.name ?? this.getNameFromUser(user),
    };
  }
}