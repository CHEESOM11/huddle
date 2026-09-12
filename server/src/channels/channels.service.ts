// import {
//   BadRequestException,
//   ConflictException,
//   ForbiddenException,
//   Injectable,
//   NotFoundException,
//   UnauthorizedException,
// } from "@nestjs/common";

// import { createClient, SupabaseClient } from "@supabase/supabase-js";
// import * as crypto from "crypto";

// @Injectable()
// export class ChannelsService {
//   /**
//    * Creates a Supabase client that acts on behalf
//    * of the currently authenticated user.
//    */
//   private getAuthenticatedClient(accessToken: string): SupabaseClient {
//     return createClient(
//       process.env.SUPABASE_URL!,
//       process.env.SUPABASE_PUBLISHABLE_KEY!,
//       {
//         auth: {
//           autoRefreshToken: false,
//           persistSession: false,
//           detectSessionInUrl: false,
//         },
//         global: {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//           },
//         },
//       },
//     );
//   }

//   //Create a new channel and add the authenticated user as a member.
//   async createChannel(name: string, accessToken: string) {
//     if (!name || !name.trim()) {
//       throw new BadRequestException("Channel name is required.");
//     }

//     if (!accessToken) {
//       throw new UnauthorizedException("Authorization token is required.");
//     }

//     const supabase = this.getAuthenticatedClient(accessToken);

//     // Verify that the access token belongs to a valid user.
//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser(accessToken);

//     if (userError || !user) {
//       throw new UnauthorizedException(
//         "Invalid or expired authorization token.",
//       );
//     }

//     // Create the channel.
//     const { data: channel, error: channelError } = await supabase
//       .from("channels")
//       .insert({
//         name: name.trim(),
//         created_by: user.id,
//       })
//       .select()
//       .single();

//     if (channelError) {
//       throw new BadRequestException(channelError.message);
//     }

//     // Channel creator becomes a member of the channel.
//     const { error: memberError } = await supabase
//       .from("channel_members")
//       .insert({
//         channel_id: channel.id,
//         user_id: user.id,
//       });

//     if (memberError) {
//       throw new BadRequestException(memberError.message);
//     }

//     return {
//       message: "Channel created successfully.",
//       channel,
//     };
//   }

//   //Get channels the authenticated user belongs to.

//   async getChannels(accessToken: string) {
//     if (!accessToken) {
//       throw new UnauthorizedException("Authorization token is required.");
//     }

//     const supabase = this.getAuthenticatedClient(accessToken);

//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser(accessToken);

//     if (userError || !user) {
//       throw new UnauthorizedException(
//         "Invalid or expired authorization token.",
//       );
//     }

//     const { data, error } = await supabase
//       .from("channel_members")
//       .select(
//         `
//         channel_id,
//         channels (
//           id,
//           name,
//           created_by,
//           created_at
//         )
//       `,
//       )
//       .eq("user_id", user.id);

//     if (error) {
//       throw new BadRequestException(error.message);
//     }

//     return {
//       message: "Channels retrieved successfully.",
//       channels: data,
//     };
//   }

//   //Join an existing channel.

//   async joinChannel(channelId: string, accessToken: string) {
//     if (!channelId) {
//       throw new BadRequestException("Channel ID is required.");
//     }

//     if (!accessToken) {
//       throw new UnauthorizedException("Authorization token is required.");
//     }

//     const supabase = this.getAuthenticatedClient(accessToken);

//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser(accessToken);

//     if (userError || !user) {
//       throw new UnauthorizedException(
//         "Invalid or expired authorization token.",
//       );
//     }

//     // Check that the channel exists.
//     const { data: channel, error: channelError } = await supabase
//       .from("channels")
//       .select("id, name, created_by, created_at")
//       .eq("id", channelId)
//       .single();

//     if (channelError || !channel) {
//       throw new NotFoundException("Channel not found.");
//     }

//     // To verify if user is already a member.
//     const { data: existingMember, error: memberCheckError } = await supabase
//       .from("channel_members")
//       .select("channel_id, user_id")
//       .eq("channel_id", channelId)
//       .eq("user_id", user.id)
//       .maybeSingle();

//     if (memberCheckError) {
//       throw new BadRequestException(memberCheckError.message);
//     }

//     if (existingMember) {
//       throw new ConflictException("You are already a member of this channel.");
//     }

//     // Add the user to the channel.
//     const { error: joinError } = await supabase.from("channel_members").insert({
//       channel_id: channelId,
//       user_id: user.id,
//     });

//     if (joinError) {
//       throw new BadRequestException(joinError.message);
//     }

//     return {
//       message: "You joined the channel successfully.",
//       channel,
//     };
//   }

//   async deleteChannel(channelId: string, accessToken: string) {
//     if (!channelId) {
//       throw new BadRequestException("Channel ID is required.");
//     }

//     if (!accessToken) {
//       throw new UnauthorizedException("Authorization token is required.");
//     }

//     const supabase = this.getAuthenticatedClient(accessToken);

//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser(accessToken);

//     if (userError || !user) {
//       throw new UnauthorizedException(
//         "Invalid or expired authorization token.",
//       );
//     }

//     const { data: channel, error: channelError } = await supabase
//       .from("channels")
//       .select("id, created_by")
//       .eq("id", channelId)
//       .single();

//     if (channelError || !channel) {
//       throw new NotFoundException("Channel not found.");
//     }

//     if (channel.created_by !== user.id) {
//       throw new ForbiddenException("You can only delete channels you created.");
//     }

//     const { error: deleteError } = await supabase
//       .from("channels")
//       .delete()
//       .eq("id", channelId);

//     if (deleteError) {
//       throw new BadRequestException(deleteError.message);
//     }

//     return {
//       message: "Channel deleted successfully.",
//     };
//   }

//   async inviteUser(
//   channelId: string,
//   accessToken: string,
// ) {
//   if (!channelId) {
//     throw new BadRequestException('Channel ID is required.');
//   }

//   if (!accessToken) {
//     throw new UnauthorizedException(
//       'Authorization token is required.',
//     );
//   }

//   // Authenticate the person making the invitation
//   const supabase = this.getAuthenticatedClient(accessToken);

//   const {
//     data: { user },
//     error: userError,
//   } = await supabase.auth.getUser(accessToken);

//   if (userError || !user) {
//     throw new UnauthorizedException(
//       'Invalid or expired authorization token.',
//     );
//   }

//   // Check that the channel exists
//   const {
//     data: channel,
//     error: channelError,
//   } = await supabase
//     .from('channels')
//     .select('id, name, created_by, created_at')
//     .eq('id', channelId)
//     .single();

//   if (channelError || !channel) {
//     throw new NotFoundException('Channel not found.');
//   }

//   // Check that the inviter belongs to the channel
//   const {
//     data: membership,
//     error: membershipError,
//   } = await supabase
//     .from('channel_members')
//     .select('channel_id, user_id')
//     .eq('channel_id', channelId)
//     .eq('user_id', user.id)
//     .maybeSingle();

//   if (membershipError) {
//     throw new BadRequestException(membershipError.message);
//   }

//   if (!membership) {
//     throw new ForbiddenException(
//       'You must be a member of this channel to invite others.',
//     );
//   }

//   //Generate a unique invite code
//   const code = `${crypto.randomUUID().replace(/-/g, '').slice(0,  12)}`;

//   //Save the invite 
//   const { data: invite, error: inviteError } = await supabase
//     .from('invites')
//     .insert({
//       channel_id: channelId,
//       code: code,
//       created_by: user.id,
//     })
//     .select('id, channel_id, code, created_by, created_at')
//     .single();

//   if (inviteError || !invite) {
//     throw new BadRequestException(inviteError?.message ?? 'Failed to create invite.');
//   }

//   return {
//     message: 'Invite created successfully.',
//     code: invite.code,
//   };

// }
// }

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  createClient,
  SupabaseClient,
} from "@supabase/supabase-js";

import * as crypto from "crypto";

import { getUserDisplayNames } from "../config/supabaseAdmin";

@Injectable()
export class ChannelsService {
  /**
   * Creates a Supabase client that acts on behalf
   * of the currently authenticated user.
   */
  private getAuthenticatedClient(
    accessToken: string,
  ): SupabaseClient {
    if (!accessToken) {
      throw new UnauthorizedException(
        "Authorization token is required.",
      );
    }

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

  // Create a new channel and add the authenticated user as a member.
  async createChannel(
    name: string,
    accessToken: string,
  ) {
    if (!name || !name.trim()) {
      throw new BadRequestException(
        "Channel name is required.",
      );
    }

    if (!accessToken) {
      throw new UnauthorizedException(
        "Authorization token is required.",
      );
    }

    const supabase =
      this.getAuthenticatedClient(
        accessToken,
      );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(
      accessToken,
    );

    if (userError || !user) {
      throw new UnauthorizedException(
        "Invalid or expired authorization token.",
      );
    }

    const {
      data: channel,
      error: channelError,
    } = await supabase
      .from("channels")
      .insert({
        name: name.trim(),
        created_by: user.id,
      })
      .select()
      .single();

    if (channelError) {
      throw new BadRequestException(
        channelError.message,
      );
    }

    const { error: memberError } =
      await supabase
        .from("channel_members")
        .insert({
          channel_id: channel.id,
          user_id: user.id,
        });

    if (memberError) {
      throw new BadRequestException(
        memberError.message,
      );
    }

    return {
      message:
        "Channel created successfully.",
      channel,
    };
  }

  // Get channels the authenticated user belongs to.
  async getChannels(
    accessToken: string,
  ) {
    if (!accessToken) {
      throw new UnauthorizedException(
        "Authorization token is required.",
      );
    }

    const supabase =
      this.getAuthenticatedClient(
        accessToken,
      );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(
      accessToken,
    );

    if (userError || !user) {
      throw new UnauthorizedException(
        "Invalid or expired authorization token.",
      );
    }

    const { data, error } =
      await supabase
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
      throw new BadRequestException(
        error.message,
      );
    }

    const channels =
      await Promise.all(
        (data ?? []).map(
          async (item) => {
            const {
              count,
              error: countError,
            } = await supabase
              .from("channel_members")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq(
                "channel_id",
                item.channel_id,
              );

            if (countError) {
              throw new BadRequestException(
                countError.message,
              );
            }

            return {
              ...item,
              memberCount:
                count ?? 0,
            };
          },
        ),
      );

    return {
      message:
        "Channels retrieved successfully.",
      channels,
    };
  }

  // Get all members of a channel.
  async getChannelMembers(
    channelId: string,
    accessToken: string,
  ) {
    if (!channelId) {
      throw new BadRequestException(
        "Channel ID is required.",
      );
    }

    if (!accessToken) {
      throw new UnauthorizedException(
        "Authorization token is required.",
      );
    }

    const supabase =
      this.getAuthenticatedClient(
        accessToken,
      );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(
      accessToken,
    );

    if (userError || !user) {
      throw new UnauthorizedException(
        "Invalid or expired authorization token.",
      );
    }

    const {
      data: channel,
      error: channelError,
    } = await supabase
      .from("channels")
      .select(
        "id, name, created_by, created_at",
      )
      .eq("id", channelId)
      .maybeSingle();

    if (channelError) {
      throw new BadRequestException(
        channelError.message,
      );
    }

    if (!channel) {
      throw new NotFoundException(
        "Channel not found.",
      );
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("channel_members")
      .select("id")
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      throw new BadRequestException(
        membershipError.message,
      );
    }

    if (!membership) {
      throw new ForbiddenException(
        "You must be a member of this channel.",
      );
    }

    const {
      data: members,
      error: membersError,
    } = await supabase
      .from("channel_members")
      .select("id, user_id")
      .eq("channel_id", channelId);

    if (membersError) {
      throw new BadRequestException(
        membersError.message,
      );
    }

    const memberNames = await getUserDisplayNames(
      (members ?? []).map((member) => member.user_id),
    );

    return {
      message:
        "Channel members retrieved successfully.",
      channelId,
      memberCount:
        members?.length ?? 0,
      members: (members ?? []).map((member) => ({
        ...member,
        name: memberNames.get(member.user_id) ?? null,
      })),
    };
  }

  // Join an existing channel.
  async joinChannel(
    channelId: string,
    accessToken: string,
  ) {
    if (!channelId) {
      throw new BadRequestException(
        "Channel ID is required.",
      );
    }

    if (!accessToken) {
      throw new UnauthorizedException(
        "Authorization token is required.",
      );
    }

    const supabase =
      this.getAuthenticatedClient(
        accessToken,
      );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(
      accessToken,
    );

    if (userError || !user) {
      throw new UnauthorizedException(
        "Invalid or expired authorization token.",
      );
    }

    const {
      data: channel,
      error: channelError,
    } = await supabase
      .from("channels")
      .select(
        "id, name, created_by, created_at",
      )
      .eq("id", channelId)
      .single();

    if (channelError || !channel) {
      throw new NotFoundException(
        "Channel not found.",
      );
    }

    const {
      data: existingMember,
      error: memberCheckError,
    } = await supabase
      .from("channel_members")
      .select("channel_id, user_id")
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberCheckError) {
      throw new BadRequestException(
        memberCheckError.message,
      );
    }

    if (existingMember) {
      throw new ConflictException(
        "You are already a member of this channel.",
      );
    }

    const { error: joinError } =
      await supabase
        .from("channel_members")
        .insert({
          channel_id: channelId,
          user_id: user.id,
        });

    if (joinError) {
      throw new BadRequestException(
        joinError.message,
      );
    }

    return {
      message:
        "You joined the channel successfully.",
      channel,
    };
  }

  async deleteChannel(
    channelId: string,
    accessToken: string,
  ) {
    if (!channelId) {
      throw new BadRequestException(
        "Channel ID is required.",
      );
    }

    if (!accessToken) {
      throw new UnauthorizedException(
        "Authorization token is required.",
      );
    }

    const supabase =
      this.getAuthenticatedClient(
        accessToken,
      );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(
      accessToken,
    );

    if (userError || !user) {
      throw new UnauthorizedException(
        "Invalid or expired authorization token.",
      );
    }

    const {
      data: channel,
      error: channelError,
    } = await supabase
      .from("channels")
      .select("id, created_by")
      .eq("id", channelId)
      .single();

    if (channelError || !channel) {
      throw new NotFoundException(
        "Channel not found.",
      );
    }

    if (channel.created_by !== user.id) {
      throw new ForbiddenException(
        "You can only delete channels you created.",
      );
    }

    const { error: deleteError } =
      await supabase
        .from("channels")
        .delete()
        .eq("id", channelId);

    if (deleteError) {
      throw new BadRequestException(
        deleteError.message,
      );
    }

    return {
      message:
        "Channel deleted successfully.",
    };
  }

  async inviteUser(
    channelId: string,
    accessToken: string,
  ) {
    if (!channelId) {
      throw new BadRequestException(
        "Channel ID is required.",
      );
    }

    if (!accessToken) {
      throw new UnauthorizedException(
        "Authorization token is required.",
      );
    }

    const supabase =
      this.getAuthenticatedClient(
        accessToken,
      );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(
      accessToken,
    );

    if (userError || !user) {
      throw new UnauthorizedException(
        "Invalid or expired authorization token.",
      );
    }

    const {
      data: channel,
      error: channelError,
    } = await supabase
      .from("channels")
      .select(
        "id, name, created_by, created_at",
      )
      .eq("id", channelId)
      .single();

    if (channelError || !channel) {
      throw new NotFoundException(
        "Channel not found.",
      );
    }

    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("channel_members")
      .select(
        "channel_id, user_id",
      )
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      throw new BadRequestException(
        membershipError.message,
      );
    }

    if (!membership) {
      throw new ForbiddenException(
        "You must be a member of this channel to invite others.",
      );
    }

    const code =
      `${crypto.randomUUID()
        .replace(/-/g, "")
        .slice(0, 12)}`;

    const {
      data: invite,
      error: inviteError,
    } = await supabase
      .from("invites")
      .insert({
        channel_id: channelId,
        code: code,
        created_by: user.id,
      })
      .select(
        "id, channel_id, code, created_by, created_at",
      )
      .single();

    if (inviteError || !invite) {
      throw new BadRequestException(
        inviteError?.message ??
          "Failed to create invite.",
      );
    }

    return {
      message:
        "Invite created successfully.",
      code: invite.code,
    };
  }
}