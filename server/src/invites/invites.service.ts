import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  createClient,
  SupabaseClient,
} from "@supabase/supabase-js";

@Injectable()
export class InvitesService {
  /**
   * Creates a Supabase client that acts on behalf
   * of the currently authenticated user.
   */
  private getAuthenticatedClient(
    accessToken: string,
  ): SupabaseClient {
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

  // Get the channel associated with an invite code.
  async getInvite(code: string) {
    if (!code || !code.trim()) {
      throw new BadRequestException("Invite code is required.");
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );

    const {
      data: invite,
      error: inviteError,
    } = await supabase
      .from("invites")
      .select(
        `
        code,
        channel_id,
        channels (
          id,
          name
        )
      `,
      )
      .eq("code", code.trim())
      .maybeSingle();

    if (inviteError) {
      throw new BadRequestException(inviteError.message);
    }

    if (!invite) {
      throw new NotFoundException("Invite not found or is invalid.");
    }

    return {
      channel: invite.channels,
    };
  }


  async acceptInvite(
    code: string,
    accessToken: string,
  ) {
    if (!code || !code.trim()) {
      throw new BadRequestException("Invite code is required.");
    }

    if (!accessToken) {
      throw new UnauthorizedException(
        "Authorization token is required.",
      );
    }

    const supabase = this.getAuthenticatedClient(accessToken);

    // Authenticate the person accepting the invite.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedException(
        "Invalid or expired authorization token.",
      );
    }

    // Find the invite by code. Read only `channel_id` here: the embedded
    // `channels` relation is RLS-filtered for a user who isn't a member yet,
    // so it comes back null. We read the channel AFTER joining below, when
    // the user is a member and the row is visible to them.
    const {
      data: invite,
      error: inviteError,
    } = await supabase
      .from("invites")
      .select("channel_id")
      .eq("code", code.trim())
      .maybeSingle();

    if (inviteError) {
      throw new BadRequestException(inviteError.message);
    }

    if (!invite) {
      throw new NotFoundException(
        "Invite not found or is invalid.",
      );
    }

    const channelId = invite.channel_id;

    // Check whether the user is already a member.
    const {
      data: existingMember,
      error: membershipError,
    } = await supabase
      .from("channel_members")
      .select("channel_id, user_id")
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      throw new BadRequestException(
        membershipError.message,
      );
    }

    if (existingMember) {
      throw new ConflictException(
        "You are already a member of this channel.",
      );
    }

    // Add the authenticated user to the channel. Allowed by the
    // `channel_members` INSERT policy (`user_id = auth.uid()`): the invitee
    // adds themselves, so no service-role client is needed.
    const {
      error: joinError,
    } = await supabase
      .from("channel_members")
      .insert({
        channel_id: channelId,
        user_id: user.id,
        role: "member",
      });

    if (joinError) {
      throw new BadRequestException(
        joinError.message,
      );
    }

    // Now that the user is a member, the channel row is visible to them.
    const {
      data: channel,
      error: channelError,
    } = await supabase
      .from("channels")
      .select("id, name, created_by, created_at")
      .eq("id", channelId)
      .maybeSingle();

    if (channelError) {
      throw new BadRequestException(
        channelError.message,
      );
    }

    if (!channel) {
      throw new NotFoundException(
        "The channel associated with this invite no longer exists.",
      );
    }

    return {
      message: "Invite accepted successfully.",
      channel,
    };
  }
}