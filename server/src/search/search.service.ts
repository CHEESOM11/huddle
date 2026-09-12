import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  createClient,
  SupabaseClient,
} from '@supabase/supabase-js';

@Injectable()
export class SearchService {
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

  async searchMessages(
    query: string,
    accessToken: string,
  ) {
    if (!query?.trim()) {
      throw new BadRequestException(
        'Search query is required.',
      );
    }

    if (!accessToken) {
      throw new UnauthorizedException(
        'Authentication token is required.',
      );
    }

    const supabase =
      this.getAuthenticatedClient(accessToken);

    // Verify the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new UnauthorizedException(
        'Invalid or expired authentication token.',
      );
    }

    /*
     * Get the channels that the authenticated user belongs to.
     */
    const {
      data: memberships,
      error: membershipError,
    } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', user.id);

    if (membershipError) {
      throw new BadRequestException(
        membershipError.message,
      );
    }

    const channelIds =
      (memberships ?? []).map(
        (membership) => membership.channel_id,
      );

    if (channelIds.length === 0) {
      return {
        messages: [],
      };
    }

    /*
     * Convert the search text into a PostgreSQL
     * full-text search query.
     *
     * Example:
     * "hello world"
     * becomes:
     * "hello & world"
     */
    const searchQuery = query
      .trim()
      .split(/\s+/)
      .map((word) => word.replace(/[^\w]/g, ''))
      .filter(Boolean)
      .join(' & ');

    if (!searchQuery) {
      throw new BadRequestException(
        'Please provide a valid search query.',
      );
    }

    /*
     * Search only messages from channels
     * the authenticated user belongs to.
     */
    const {
      data: messages,
      error: searchError,
    } = await supabase
      .from('messages')
      .select(
        `
        id,
        channel_id,
        user_id,
        content,
        created_at,
        channels (
          id,
          name
        ),
        profiles (
          id,
          name,
          avatar_url
        )
        `,
      )
      .in('channel_id', channelIds)
      .textSearch('search', searchQuery)
      .order('created_at', {
        ascending: false,
      });

    if (searchError) {
      throw new BadRequestException(
        searchError.message,
      );
    }

    const results = (messages ?? []).map(
      (message: any) => ({
        id: message.id,
        channel_id: message.channel_id,
        user_id: message.user_id,
        content: message.content,
        created_at: message.created_at,

        channel: message.channels,

        author: message.profiles,

        snippet: this.createSnippet(
          message.content,
          query,
        ),
      }),
    );

    return {
      messages: results,
    };
  }

  private createSnippet(
    content: string,
    query: string,
  ): string {
    const cleanContent = content.trim();

    if (!cleanContent) {
      return '';
    }

    const words = query
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const lowerContent =
      cleanContent.toLowerCase();

    const matchingWord = words.find(
      (word) =>
        lowerContent.includes(
          word.toLowerCase(),
        ),
    );

    if (!matchingWord) {
      return cleanContent.length > 120
        ? `${cleanContent.substring(0, 120)}...`
        : cleanContent;
    }

    const index = lowerContent.indexOf(
      matchingWord.toLowerCase(),
    );

    const start = Math.max(0, index - 50);
    const end = Math.min(
      cleanContent.length,
      index + matchingWord.length + 70,
    );

    let snippet = cleanContent.substring(
      start,
      end,
    );

    if (start > 0) {
      snippet = `...${snippet}`;
    }

    if (end < cleanContent.length) {
      snippet = `${snippet}...`;
    }

    return snippet;
  }
}