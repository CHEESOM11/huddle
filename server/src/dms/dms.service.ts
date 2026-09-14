import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DmsService {
  private getAuthenticatedClient(
    accessToken: string,
  ): SupabaseClient {
    if (!accessToken) {
      throw new UnauthorizedException(
        'Authorization token is required.',
      );
    }

    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;

    return createClient(url, key, {
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
    });
  }

  private async getAuthenticatedUser(
    accessToken: string,
  ) {
    const client = this.getAuthenticatedClient(accessToken);

    const {
      data: { user },
      error,
    } = await client.auth.getUser(accessToken);

    if (error || !user) {
      throw new UnauthorizedException(
        'Invalid or expired access token.',
      );
    }

    return {
      client,
      user,
    };
  }

  async createConversation(
    userIds: string[],
    accessToken: string,
  ) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new BadRequestException(
        'userIds must contain at least one user.',
      );
    }

    const { client, user } =
      await this.getAuthenticatedUser(accessToken);

    const memberIds = Array.from(
      new Set([user.id, ...userIds]),
    );

    if (memberIds.length < 2) {
      throw new BadRequestException(
        'A conversation must contain another user.',
      );
    }

    /*
     * Find-or-create the conversation in the database. This runs as a
     * `security definer` RPC so it can validate members and insert every
     * membership row atomically — something the per-user RLS policies on
     * conversation_members would otherwise block (you cannot insert another
     * user's row directly). It also returns the existing conversation when
     * one with exactly this member set already exists.
     */
    const { data: conversationId, error } = await client
      .rpc('create_conversation', {
        user_ids: memberIds,
      });

    if (error) {
      if (/could not be found/i.test(error.message)) {
        throw new NotFoundException(error.message);
      }

      throw new BadRequestException(error.message);
    }

    return this.getConversation(
      conversationId,
      accessToken,
    );
  }

  async getConversations(
    accessToken: string,
  ) {
    const { client, user } =
      await this.getAuthenticatedUser(accessToken);

    const {
      data: memberships,
      error: membershipError,
    } = await client
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (membershipError) {
      throw new BadRequestException(
        membershipError.message,
      );
    }

    const conversationIds =
      memberships?.map(
        (item) => item.conversation_id,
      ) ?? [];

    if (conversationIds.length === 0) {
      return [];
    }

    const conversations = [];

    for (const conversationId of conversationIds) {
      const conversation =
        await this.getConversation(
          conversationId,
          accessToken,
        );

      conversations.push(conversation);
    }

    conversations.sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    );

    return conversations;
  }

  async getConversation(
    conversationId: string,
    accessToken: string,
  ) {
    const { client, user } =
      await this.getAuthenticatedUser(accessToken);

    const {
      data: membership,
      error: membershipError,
    } = await client
      .from('conversation_members')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      throw new BadRequestException(
        membershipError.message,
      );
    }

    if (!membership) {
      throw new UnauthorizedException(
        'You are not a member of this conversation.',
      );
    }

    const {
      data: conversation,
      error: conversationError,
    } = await client
      .from('conversations')
      .select('id, created_at')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      throw new NotFoundException(
        'Conversation not found.',
      );
    }

    const {
      data: members,
      error: membersError,
    } = await client
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (membersError) {
      throw new BadRequestException(
        membersError.message,
      );
    }

    const memberIds =
      members?.map((member) => member.user_id) ?? [];

    let memberProfiles: any[] = [];

    if (memberIds.length > 0) {
      const {
        data: profiles,
        error: profilesError,
      } = await client
        .from('profiles')
        .select(
          'id, name, email, avatar_url',
        )
        .in('id', memberIds);

      if (!profilesError) {
        memberProfiles = profiles ?? [];
      }
    }

    /*
     * Get the latest message.
     */
    const {
      data: lastMessage,
      error: lastMessageError,
    } = await client
      .from('direct_messages')
      .select(
        'id, conversation_id, user_id, content, created_at',
      )
      .eq('conversation_id', conversationId)
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (lastMessageError) {
      throw new BadRequestException(
        lastMessageError.message,
      );
    }

    return {
      ...conversation,
      members: memberProfiles,
      last_message: lastMessage ?? null,
    };
  }

  async getMessages(
    conversationId: string,
    accessToken: string,
  ) {
    const { client, user } =
      await this.getAuthenticatedUser(accessToken);

    await this.verifyMembership(
      client,
      conversationId,
      user.id,
    );

    const {
      data: messages,
      error,
    } = await client
      .from('direct_messages')
      .select(
        'id, conversation_id, user_id, content, file_path, file_name, file_type, file_size, created_at',
      )
      .eq('conversation_id', conversationId)
      .order('created_at', {
        ascending: true,
      });

    if (error) {
      throw new BadRequestException(
        error.message,
      );
    }

    return messages ?? [];
  }

  async sendMessage(
    conversationId: string,
    content: string,
    accessToken: string,
    parentId?: string,
    filePath?: string,
    fileName?: string,
    fileType?: string,
    fileSize?: number,
  ) {
    const trimmedContent =
      content?.trim();

    if (!trimmedContent && !filePath ) {
      throw new BadRequestException(
        'Message content cannot be empty.',
      );
    }

    const { client, user } =
      await this.getAuthenticatedUser(accessToken);

    await this.verifyMembership(
      client,
      conversationId,
      user.id,
    );

    const {
      data: message,
      error,
    } = await client
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        content: trimmedContent ?? "",
        parent_id: parentId ?? null,
        file_path: filePath ?? null,
        file_name: fileName ?? null,
        file_type: fileType ?? null,
        file_size: fileSize ?? null,
      })
      .select(
        'id, conversation_id, user_id, content, file_path, file_name, file_type, file_size, created_at',
      )
      .single();

    if (error || !message) {
      throw new BadRequestException(
        error?.message ??
          'Failed to send direct message.',
      );
    }

    return message;
  }

    async editMessage(
    messageId: string,
    content: string,
    accessToken: string,
  ) {
    if (!content?.trim()) {
      throw new BadRequestException("Message content cannot be empty.");
    }

    const client = this.getAuthenticatedClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedException("Invalid or expired authorization token.");
    }

    const { data: message, error: messageError } = await client
      .from("direct_messages")
      .select("id, user_id")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      throw new NotFoundException("Message not found.");
    }

    if (message.user_id !== user.id) {
      throw new ForbiddenException("You can only edit your own messages.");
    }

    const { data: updatedMessage, error: updateError } = await client
      .from("direct_messages")
      .update({
        content: content.trim(),
      })
      .eq("id", messageId)
      .select(`
        id,
        conversation_id,
        user_id,
        content,
        file_path,
        file_name,
        file_type,
        file_size,
        created_at
      `)
      .single();

    if (updateError) {
      throw new BadRequestException(updateError.message);
    }

    return updatedMessage;
  }

  async deleteMessage(
    messageId: string,
    accessToken: string,
  ) {
    const client = this.getAuthenticatedClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedException("Invalid or expired authorization token.");
    }

    const { data: message, error: messageError } = await client
      .from("direct_messages")
      .select("id, user_id")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      throw new NotFoundException("Message not found.");
    }

    if (message.user_id !== user.id) {
      throw new ForbiddenException("You can only delete your own messages.");
    }

    const { error: deleteError } = await client
      .from("direct_messages")
      .delete()
      .eq("id", messageId);

    if (deleteError) {
      throw new BadRequestException(deleteError.message);
    }

    return {
      message: "Message deleted successfully.",
    };
  }

  async toggleReaction(
    messageId: string,
    emoji: string,
    accessToken: string,
  ) {
    if (!emoji?.trim()) {
      throw new BadRequestException("Emoji is required.");
    }

    const client = this.getAuthenticatedClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedException("Invalid or expired authorization token.");
    }

    const { data: existing, error: existingError } = await client
      .from("direct_message_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji.trim())
      .maybeSingle();

    if (existingError) {
      throw new BadRequestException(existingError.message);
    }

    if (existing) {
      await client
        .from("direct_message_reactions")
        .delete()
        .eq("id", existing.id);
    } else {
      const { error } = await client
        .from("direct_message_reactions")
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji: emoji.trim(),
        });

      if (error) {
        throw new BadRequestException(error.message);
      }
    }

    const { data: reactions, error: reactionsError } = await client
      .from("direct_message_reactions")
      .select("emoji, user_id")
      .eq("message_id", messageId);

    if (reactionsError) {
      throw new BadRequestException(reactionsError.message);
    }

    const grouped = new Map<
      string,
      { emoji: string; count: number; users: string[] }
    >();

    for (const reaction of reactions ?? []) {
      if (!grouped.has(reaction.emoji)) {
        grouped.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 0,
          users: [],
        });
      }

      const item = grouped.get(reaction.emoji)!;
      item.count++;
      item.users.push(reaction.user_id);
    }

    return Array.from(grouped.values());
  }

  private async verifyMembership(
    client: SupabaseClient,
    conversationId: string,
    userId: string,
  ) {
    const {
      data: membership,
      error,
    } = await client
      .from('conversation_members')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message,
      );
    }

    if (!membership) {
      throw new UnauthorizedException(
        'You are not a member of this conversation.',
      );
    }
  }
}
