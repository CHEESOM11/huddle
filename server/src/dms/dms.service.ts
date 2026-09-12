import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '../config/supabase';

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
     * Make sure every requested user actually exists.
     */
    const { data: profiles, error: profilesError } =
      await client
        .from('profiles')
        .select('id')
        .in('id', memberIds);

    if (profilesError) {
      throw new BadRequestException(
        profilesError.message,
      );
    }

    const existingProfileIds =
      profiles?.map((profile) => profile.id) ?? [];

    const missingUser = memberIds.some(
      (id) => !existingProfileIds.includes(id),
    );

    if (missingUser) {
      throw new NotFoundException(
        'One or more users could not be found.',
      );
    }

    /*
     * Find conversations that the current user belongs to.
     */
    const {
      data: currentMemberships,
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
      currentMemberships?.map(
        (item) => item.conversation_id,
      ) ?? [];

    /*
     * Check whether one of those conversations has
     * exactly the requested members.
     */
    for (const conversationId of conversationIds) {
      const {
        data: members,
        error: membersError,
      } = await client
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId);

      if (membersError) {
        continue;
      }

      const existingMemberIds =
        members?.map((member) => member.user_id) ?? [];

      const sameMembers =
        existingMemberIds.length === memberIds.length &&
        existingMemberIds.every((id) =>
          memberIds.includes(id),
        );

      if (sameMembers) {
        return this.getConversation(
          conversationId,
          accessToken,
        );
      }
    }

    /*
     * No matching conversation exists.
     * Create one.
     */
    const { data: conversation, error: conversationError } =
      await client
        .from('conversations')
        .insert({})
        .select()
        .single();

    if (conversationError || !conversation) {
      throw new BadRequestException(
        conversationError?.message ??
          'Failed to create conversation.',
      );
    }

    const memberRows = memberIds.map((userId) => ({
      conversation_id: conversation.id,
      user_id: userId,
    }));

    const {
      error: insertMembersError,
    } = await client
      .from('conversation_members')
      .insert(memberRows);

    if (insertMembersError) {
      await client
        .from('conversations')
        .delete()
        .eq('id', conversation.id);

      throw new BadRequestException(
        insertMembersError.message,
      );
    }

    return this.getConversation(
      conversation.id,
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
        'id, conversation_id, user_id, content, created_at',
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
  ) {
    const trimmedContent =
      content?.trim();

    if (!trimmedContent) {
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
        content: trimmedContent,
      })
      .select(
        'id, conversation_id, user_id, content, created_at',
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