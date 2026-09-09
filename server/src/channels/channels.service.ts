import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class ChannelsService {
  /**
   * Creates a Supabase client that acts on behalf
   * of the currently authenticated user.
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

  //Create a new channel and add the authenticated user as a member.
  async createChannel(name: string, accessToken: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException("Channel name is required.");
    }

    if (!accessToken) {
      throw new UnauthorizedException("Authorization token is required.");
    }

    const supabase = this.getAuthenticatedClient(accessToken);

    // Verify that the access token belongs to a valid user.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedException(
        "Invalid or expired authorization token.",
      );
    }

    // Create the channel.
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .insert({
        name: name.trim(),
        created_by: user.id,
      })
      .select()
      .single();

    if (channelError) {
      throw new BadRequestException(channelError.message);
    }

    // Channel creator becomes a member of the channel.
    const { error: memberError } = await supabase
      .from("channel_members")
      .insert({
        channel_id: channel.id,
        user_id: user.id,
      });

    if (memberError) {
      throw new BadRequestException(memberError.message);
    }

    return {
      message: "Channel created successfully.",
      channel,
    };
  }

  
    //Get channels the authenticated user belongs to.
   
  async getChannels(accessToken: string) {
    if (!accessToken) {
      throw new UnauthorizedException("Authorization token is required.");
    }

    const supabase = this.getAuthenticatedClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedException(
        "Invalid or expired authorization token.",
      );
    }

    const { data, error } = await supabase
      .from("channel_members")
      .select(
        `
        channel_id,
        channels (
          id,
          name,
          created_by,
          created_at
        )
      `,
      )
      .eq("user_id", user.id);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: "Channels retrieved successfully.",
      channels: data,
    };
  }

  //Join an existing channel.
   
  async joinChannel(channelId: string, accessToken: string) {
    if (!channelId) {
      throw new BadRequestException("Channel ID is required.");
    }

    if (!accessToken) {
      throw new UnauthorizedException("Authorization token is required.");
    }

    const supabase = this.getAuthenticatedClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedException(
        "Invalid or expired authorization token.",
      );
    }

    // Check that the channel exists.
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id, name, created_by, created_at")
      .eq("id", channelId)
      .single();

    if (channelError || !channel) {
      throw new NotFoundException("Channel not found.");
    }

    // To verify if user is already a member.
    const { data: existingMember, error: memberCheckError } = await supabase
      .from("channel_members")
      .select("channel_id, user_id")
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberCheckError) {
      throw new BadRequestException(memberCheckError.message);
    }

    if (existingMember) {
      throw new ConflictException("You are already a member of this channel.");
    }

    // Add the user to the channel.
    const { error: joinError } = await supabase.from("channel_members").insert({
      channel_id: channelId,
      user_id: user.id,
    });

    if (joinError) {
      throw new BadRequestException(joinError.message);
    }

    return {
      message: "You joined the channel successfully.",
      channel,
    };
  }
}
