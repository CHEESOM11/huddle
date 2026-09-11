// import {
//   BadRequestException,
//   Injectable,
//   UnauthorizedException,
// } from '@nestjs/common';

// import { createClient, SupabaseClient } from '@supabase/supabase-js';

// @Injectable()
// export class MessagesService {
//   private getAuthenticatedClient(
//     accessToken: string,
//   ): SupabaseClient {
//     if (!accessToken) {
//       throw new UnauthorizedException(
//         'Authentication token is required.',
//       );
//     }

//     return createClient(
//       process.env.SUPABASE_URL!,
//       process.env.SUPABASE_PUBLISHABLE_KEY!,
//       {
//         global: {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//           },
//         },
//         auth: {
//           autoRefreshToken: false,
//           persistSession: false,
//           detectSessionInUrl: false,
//         },
//       },
//     );
//   }

//   private async getAuthenticatedUser(
//     accessToken: string,
//   ) {
//     const authenticatedSupabase =
//       this.getAuthenticatedClient(accessToken);

//     const {
//       data: { user },
//       error,
//     } = await authenticatedSupabase.auth.getUser();

//     if (error || !user) {
//       throw new UnauthorizedException(
//         'Invalid or expired authentication token.',
//       );
//     }

//     return user;
//   }

//   private async verifyChannelExists(
//     channelId: string,
//     accessToken: string,
//   ) {
//     const authenticatedSupabase =
//       this.getAuthenticatedClient(accessToken);

//     const { data, error } = await authenticatedSupabase
//       .from('channels')
//       .select('id')
//       .eq('id', channelId)
//       .maybeSingle();

//     if (error) {
//       throw new BadRequestException(error.message);
//     }

//     if (!data) {
//       throw new BadRequestException(
//         'Channel does not exist.',
//       );
//     }

//     return data;
//   }

//   async verifyChannelMembership(
//     channelId: string,
//     userId: string,
//     accessToken: string,
//   ) {
//     const authenticatedSupabase =
//       this.getAuthenticatedClient(accessToken);

//     const { data, error } = await authenticatedSupabase
//       .from('channel_members')
//       .select('id')
//       .eq('channel_id', channelId)
//       .eq('user_id', userId)
//       .maybeSingle();

//     if (error) {
//       throw new BadRequestException(error.message);
//     }

//     if (!data) {
//       throw new UnauthorizedException(
//         'You are not a member of this channel.',
//       );
//     }

//     return data;
//   }

//   async sendMessage(
//     channelId: string,
//     content: string,
//     accessToken: string,
//   ) {
//     if (!channelId || !content?.trim()) {
//       throw new BadRequestException(
//         'Channel ID and message content are required.',
//       );
//     }

//     const user = await this.getAuthenticatedUser(
//       accessToken,
//     );

//     await this.verifyChannelExists(
//       channelId,
//       accessToken,
//     );

//     await this.verifyChannelMembership(
//       channelId,
//       user.id,
//       accessToken,
//     );

//     const authenticatedSupabase =
//       this.getAuthenticatedClient(accessToken);

//     const { data, error } = await authenticatedSupabase
//       .from('messages')
//       .insert({
//         channel_id: channelId,
//         user_id: user.id,
//         content: content.trim(),
//       })
//       .select(
//         'id, channel_id, user_id, content, created_at',
//       )
//       .single();

//     if (error) {
//       throw new BadRequestException(error.message);
//     }

//     return data;
//   }

//   async getMessages(
//     channelId: string,
//     accessToken: string,
//   ) {
//     if (!channelId) {
//       throw new BadRequestException(
//         'Channel ID is required.',
//       );
//     }

//     const user = await this.getAuthenticatedUser(
//       accessToken,
//     );

//     await this.verifyChannelExists(
//       channelId,
//       accessToken,
//     );

//     await this.verifyChannelMembership(
//       channelId,
//       user.id,
//       accessToken,
//     );

//     const authenticatedSupabase =
//       this.getAuthenticatedClient(accessToken);

//     const { data: messages, error } =
//       await authenticatedSupabase
//         .from('messages')
//         .select(
//           'id, channel_id, user_id, content, created_at',
//         )
//         .eq('channel_id', channelId)
//         .order('created_at', {
//           ascending: true,
//         });

//     if (error) {
//       throw new BadRequestException(error.message);
//     }

//     const messageIds = (messages ?? []).map(
//       (message) => message.id,
//     );

//     const reactionsMap = await this.getReactions(
//       messageIds,
//       accessToken,
//     );

//     return (messages ?? []).map((message) => ({
//       ...message,
//       reactions:
//         reactionsMap.get(message.id) ?? [],
//     }));
//   }

//   async getReactions(
//     messageIds: string[],
//     accessToken: string,
//   ) {
//     const map = new Map<
//       string,
//       {
//         emoji: string;
//         count: number;
//         users: string[];
//       }[]
//     >();

//     if (messageIds.length === 0) {
//       return map;
//     }

//     const authenticatedSupabase =
//       this.getAuthenticatedClient(accessToken);

//     const { data, error } =
//       await authenticatedSupabase
//         .from('message_reactions')
//         .select(
//           'message_id, emoji, user_id',
//         )
//         .in('message_id', messageIds);

//     if (error) {
//       throw new BadRequestException(error.message);
//     }

//     for (const row of data ?? []) {
//       const list =
//         map.get(row.message_id) ?? [];

//       let entry = list.find(
//         (reaction) =>
//           reaction.emoji === row.emoji,
//       );

//       if (!entry) {
//         entry = {
//           emoji: row.emoji,
//           count: 0,
//           users: [],
//         };

//         list.push(entry);
//       }

//       entry.count += 1;
//       entry.users.push(row.user_id);

//       map.set(row.message_id, list);
//     }

//     return map;
//   }

//   async toggleReaction(
//     messageId: string,
//     emoji: string,
//     userId: string,
//     accessToken: string,
//   ) {
//     if (!messageId || !emoji || !userId) {
//       throw new BadRequestException(
//         'Message ID, emoji, and user ID are required.',
//       );
//     }

//     const authenticatedSupabase =
//       this.getAuthenticatedClient(accessToken);

//     const { data: existing, error: findError } =
//       await authenticatedSupabase
//         .from('message_reactions')
//         .select('id')
//         .eq('message_id', messageId)
//         .eq('user_id', userId)
//         .eq('emoji', emoji)
//         .maybeSingle();

//     if (findError) {
//       throw new BadRequestException(
//         findError.message,
//       );
//     }

//     if (existing) {
//       const { error: deleteError } =
//         await authenticatedSupabase
//           .from('message_reactions')
//           .delete()
//           .eq('id', existing.id);

//       if (deleteError) {
//         throw new BadRequestException(
//           deleteError.message,
//         );
//       }

//       return;
//     }

//     const { error: insertError } =
//       await authenticatedSupabase
//         .from('message_reactions')
//         .insert({
//           message_id: messageId,
//           user_id: userId,
//           emoji,
//         });

//     if (insertError) {
//       throw new BadRequestException(
//         insertError.message,
//       );
//     }
//   }
// }


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

@Injectable()
export class MessagesService {
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

  async sendMessage(
    channelId: string,
    content: string,
    accessToken: string,
  ) {
    if (!channelId || !content?.trim()) {
      throw new BadRequestException(
        'Channel ID and message content are required.',
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

    const { data, error } =
      await authenticatedSupabase
        .from('messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: content.trim(),
        })
        .select(
          'id, channel_id, user_id, content, created_at',
        )
        .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
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
          'id, channel_id, user_id, content, created_at',
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

    return (messages ?? []).map(
      (message) => ({
        ...message,
        reactions:
          reactionsMap.get(message.id) ?? [],
      }),
    );
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
        'id, channel_id, user_id, content, created_at',
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
        'id, channel_id, user_id, content, created_at',
      )
      .single();

    if (updateError || !updatedMessage) {
      throw new BadRequestException(
        updateError?.message ??
          'Failed to update message.',
      );
    }

    return updatedMessage;
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
}