// import {
//   BadRequestException,
//   ConflictException,
//   ForbiddenException,
//   Injectable,
//   NotFoundException,
//   UnauthorizedException,
// } from "@nestjs/common";

// import {
//   createClient,
//   SupabaseClient,
// } from "@supabase/supabase-js";

// import * as crypto from "crypto";

// @Injectable()
// export class ChannelsService {
//   /**
//    * Creates a Supabase client that acts on behalf
//    * of the currently authenticated user.
//    */
//   private getAuthenticatedClient(
//     accessToken: string,
//   ): SupabaseClient {
//     if (!accessToken) {
//       throw new UnauthorizedException(
//         "Authorization token is required.",
//       );
//     }

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

//   // Create a new channel and add the authenticated user as a member.
//   async createChannel(
//     name: string,
//     accessToken: string,
//   ) {
//     if (!name || !name.trim()) {
//       throw new BadRequestException(
//         "Channel name is required.",
//       );
//     }

//     if (!accessToken) {
//       throw new UnauthorizedException(
//         "Authorization token is required.",
//       );
//     }

//     const supabase =
//       this.getAuthenticatedClient(
//         accessToken,
//       );

//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser(
//       accessToken,
//     );

//     if (userError || !user) {
//       throw new UnauthorizedException(
//         "Invalid or expired authorization token.",
//       );
//     }

//     const {
//       data: channel,
//       error: channelError,
//     } = await supabase
//       .from("channels")
//       .insert({
//         name: name.trim(),
//         created_by: user.id,
//       })
//       .select()
//       .single();

//     if (channelError) {
//       throw new BadRequestException(
//         channelError.message,
//       );
//     }

//     const { error: memberError } =
//       await supabase
//         .from("channel_members")
//         .insert({
//           channel_id: channel.id,
//           user_id: user.id,
//         });

//     if (memberError) {
//       throw new BadRequestException(
//         memberError.message,
//       );
//     }

//     return {
//       message:
//         "Channel created successfully.",
//       channel,
//     };
//   }

//   // Get channels the authenticated user belongs to.
//   async getChannels(
//     accessToken: string,
//   ) {
//     if (!accessToken) {
//       throw new UnauthorizedException(
//         "Authorization token is required.",
//       );
//     }

//     const supabase =
//       this.getAuthenticatedClient(
//         accessToken,
//       );

//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser(
//       accessToken,
//     );

//     if (userError || !user) {
//       throw new UnauthorizedException(
//         "Invalid or expired authorization token.",
//       );
//     }

//     const { data, error } =
//       await supabase
//         .from("channel_members")
//         .select(
//           `
//           channel_id,
//           channels (
//             id,
//             name,
//             created_by,
//             created_at
//           )
//         `,
//         )
//         .eq("user_id", user.id);

//     if (error) {
//       throw new BadRequestException(
//         error.message,
//       );
//     }

//     const channels =
//       await Promise.all(
//         (data ?? []).map(
//           async (item) => {
//             const {
//               count,
//               error: countError,
//             } = await supabase
//               .from("channel_members")
//               .select("id", {
//                 count: "exact",
//                 head: true,
//               })
//               .eq(
//                 "channel_id",
//                 item.channel_id,
//               );

//             if (countError) {
//               throw new BadRequestException(
//                 countError.message,
//               );
//             }

//             return {
//               ...item,
//               memberCount:
//                 count ?? 0,
//             };
//           },
//         ),
//       );

//     return {
//       message:
//         "Channels retrieved successfully.",
//       channels,
//     };
//   }

//   // Get all members of a channel.
//   async getChannelMembers(
//     channelId: string,
//     accessToken: string,
//   ) {
//     if (!channelId) {
//       throw new BadRequestException(
//         "Channel ID is required.",
//       );
//     }

//     if (!accessToken) {
//       throw new UnauthorizedException(
//         "Authorization token is required.",
//       );
//     }

//     const supabase =
//       this.getAuthenticatedClient(
//         accessToken,
//       );

//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser(
//       accessToken,
//     );

//     if (userError || !user) {
//       throw new UnauthorizedException(
//         "Invalid or expired authorization token.",
//       );
//     }

//     const {
//       data: channel,
//       error: channelError,
//     } = await supabase
//       .from("channels")
//       .select(
//         "id, name, created_by, created_at",
//       )
//       .eq("id", channelId)
//       .maybeSingle();

//     if (channelError) {
//       throw new BadRequestException(
//         channelError.message,
//       );
//     }

//     if (!channel) {
//       throw new NotFoundException(
//         "Channel not found.",
//       );
//     }

//     const {
//       data: membership,
//       error: membershipError,
//     } = await supabase
//       .from("channel_members")
//       .select("id")
//       .eq("channel_id", channelId)
//       .eq("user_id", user.id)
//       .maybeSingle();

//     if (membershipError) {
//       throw new BadRequestException(
//         membershipError.message,
//       );
//     }

//     if (!membership) {
//       throw new ForbiddenException(
//         "You must be a member of this channel.",
//       );
//     }

//     const {
//       data: members,
//       error: membersError,
//     } = await supabase
//       .from("channel_members")
//       .select("id, user_id")
//       .eq("channel_id", channelId);

//     if (membersError) {
//       throw new BadRequestException(
//         membersError.message,
//       );
//     }

//     return {
//       message:
//         "Channel members retrieved successfully.",
//       channelId,
//       memberCount:
//         members?.length ?? 0,
//       members: members ?? [],
//     };
//   }

//   // Join an existing channel.
//   async joinChannel(
//     channelId: string,
//     accessToken: string,
//   ) {
//     if (!channelId) {
//       throw new BadRequestException(
//         "Channel ID is required.",
//       );
//     }

//     if (!accessToken) {
//       throw new UnauthorizedException(
//         "Authorization token is required.",
//       );
//     }

//     const supabase =
//       this.getAuthenticatedClient(
//         accessToken,
//       );

//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser(
//       accessToken,
//     );

//     if (userError || !user) {
//       throw new UnauthorizedException(
//         "Invalid or expired authorization token.",
//       );
//     }

//     const {
//       data: channel,
//       error: channelError,
//     } = await supabase
//       .from("channels")
//       .select(
//         "id, name, created_by, created_at",
//       )
//       .eq("id", channelId)
//       .single();

//     if (channelError || !channel) {
//       throw new NotFoundException(
//         "Channel not found.",
//       );
//     }

//     const {
//       data: existingMember,
//       error: memberCheckError,
//     } = await supabase
//       .from("channel_members")
//       .select("channel_id, user_id")
//       .eq("channel_id", channelId)
//       .eq("user_id", user.id)
//       .maybeSingle();

//     if (memberCheckError) {
//       throw new BadRequestException(
//         memberCheckError.message,
//       );
//     }

//     if (existingMember) {
//       throw new ConflictException(
//         "You are already a member of this channel.",
//       );
//     }

//     const { error: joinError } =
//       await supabase
//         .from("channel_members")
//         .insert({
//           channel_id: channelId,
//           user_id: user.id,
//         });

//     if (joinError) {
//       throw new BadRequestException(
//         joinError.message,
//       );
//     }

//     return {
//       message:
//         "You joined the channel successfully.",
//       channel,
//     };
//   }

//   async deleteChannel(
//     channelId: string,
//     accessToken: string,
//   ) {
//     if (!channelId) {
//       throw new BadRequestException(
//         "Channel ID is required.",
//       );
//     }

//     if (!accessToken) {
//       throw new UnauthorizedException(
//         "Authorization token is required.",
//       );
//     }

//     const supabase =
//       this.getAuthenticatedClient(
//         accessToken,
//       );

//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser(
//       accessToken,
//     );

//     if (userError || !user) {
//       throw new UnauthorizedException(
//         "Invalid or expired authorization token.",
//       );
//     }

//     const {
//       data: channel,
//       error: channelError,
//     } = await supabase
//       .from("channels")
//       .select("id, created_by")
//       .eq("id", channelId)
//       .single();

//     if (channelError || !channel) {
//       throw new NotFoundException(
//         "Channel not found.",
//       );
//     }

//     if (channel.created_by !== user.id) {
//       throw new ForbiddenException(
//         "You can only delete channels you created.",
//       );
//     }

//     const { error: deleteError } =
//       await supabase
//         .from("channels")
//         .delete()
//         .eq("id", channelId);

//     if (deleteError) {
//       throw new BadRequestException(
//         deleteError.message,
//       );
//     }

//     return {
//       message:
//         "Channel deleted successfully.",
//     };
//   }

//   async inviteUser(
//     channelId: string,
//     accessToken: string,
//   ) {
//     if (!channelId) {
//       throw new BadRequestException(
//         "Channel ID is required.",
//       );
//     }

//     if (!accessToken) {
//       throw new UnauthorizedException(
//         "Authorization token is required.",
//       );
//     }

//     const supabase =
//       this.getAuthenticatedClient(
//         accessToken,
//       );

//     const {
//       data: { user },
//       error: userError,
//     } = await supabase.auth.getUser(
//       accessToken,
//     );

//     if (userError || !user) {
//       throw new UnauthorizedException(
//         "Invalid or expired authorization token.",
//       );
//     }

//     const {
//       data: channel,
//       error: channelError,
//     } = await supabase
//       .from("channels")
//       .select(
//         "id, name, created_by, created_at",
//       )
//       .eq("id", channelId)
//       .single();

//     if (channelError || !channel) {
//       throw new NotFoundException(
//         "Channel not found.",
//       );
//     }

//     const {
//       data: membership,
//       error: membershipError,
//     } = await supabase
//       .from("channel_members")
//       .select(
//         "channel_id, user_id",
//       )
//       .eq("channel_id", channelId)
//       .eq("user_id", user.id)
//       .maybeSingle();

//     if (membershipError) {
//       throw new BadRequestException(
//         membershipError.message,
//       );
//     }

//     if (!membership) {
//       throw new ForbiddenException(
//         "You must be a member of this channel to invite others.",
//       );
//     }

//     const code =
//       `${crypto.randomUUID()
//         .replace(/-/g, "")
//         .slice(0, 12)}`;

//     const {
//       data: invite,
//       error: inviteError,
//     } = await supabase
//       .from("invites")
//       .insert({
//         channel_id: channelId,
//         code: code,
//         created_by: user.id,
//       })
//       .select(
//         "id, channel_id, code, created_by, created_at",
//       )
//       .single();

//     if (inviteError || !invite) {
//       throw new BadRequestException(
//         inviteError?.message ??
//           "Failed to create invite.",
//       );
//     }

//     return {
//       message:
//         "Invite created successfully.",
//       code: invite.code,
//     };
//   }
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

  /**
   * Gets the currently authenticated user.
   */
  private async getAuthenticatedUser(
    accessToken: string,
  ) {
    const supabase =
      this.getAuthenticatedClient(accessToken);

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
   * Gets the user's role in a channel.
   */
  private async getChannelMemberRole(
    channelId: string,
    userId: string,
    accessToken: string,
  ) {
    const supabase =
      this.getAuthenticatedClient(accessToken);

    const {
      data: membership,
      error,
    } = await supabase
      .from("channel_members")
      .select("id, user_id, role")
      .eq("channel_id", channelId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message,
      );
    }

    if (!membership) {
      throw new ForbiddenException(
        "You must be a member of this channel.",
      );
    }

    return membership;
  }

  /**
   * Makes sure a user is an owner or admin.
   */
  private async verifyAdminOrOwner(
    channelId: string,
    userId: string,
    accessToken: string,
  ) {
    const membership =
      await this.getChannelMemberRole(
        channelId,
        userId,
        accessToken,
      );

    if (
      membership.role !== "owner" &&
      membership.role !== "admin"
    ) {
      throw new ForbiddenException(
        "Only the channel owner or an admin can perform this action.",
      );
    }

    return membership;
  }

  // Create a new channel and make the creator the owner.
  async createChannel(
    name: string,
    accessToken: string,
  ) {
    if (!name || !name.trim()) {
      throw new BadRequestException(
        "Channel name is required.",
      );
    }

    const user =
      await this.getAuthenticatedUser(
        accessToken,
      );

    const supabase =
      this.getAuthenticatedClient(accessToken);

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
          role: "owner",
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
    const user =
      await this.getAuthenticatedUser(
        accessToken,
      );

    const supabase =
      this.getAuthenticatedClient(accessToken);

    const { data, error } =
      await supabase
        .from("channel_members")
        .select(
          `
          channel_id,
          role,
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

    const user =
      await this.getAuthenticatedUser(
        accessToken,
      );

    const supabase =
      this.getAuthenticatedClient(accessToken);

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

    await this.getChannelMemberRole(
      channelId,
      user.id,
      accessToken,
    );

    const {
      data: members,
      error: membersError,
    } = await supabase
      .from("channel_members")
      .select(
        "id, user_id, role",
      )
      .eq("channel_id", channelId);

    if (membersError) {
      throw new BadRequestException(
        membersError.message,
      );
    }

    return {
      message:
        "Channel members retrieved successfully.",
      channelId,
      memberCount:
        members?.length ?? 0,
      members: members ?? [],
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

    const user =
      await this.getAuthenticatedUser(
        accessToken,
      );

    const supabase =
      this.getAuthenticatedClient(accessToken);

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
      .select(
        "channel_id, user_id, role",
      )
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
          role: "member",
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

  /**
   * Rename a channel / update its topic.
   *
   * Owner and admin only.
   */
  async updateChannel(
    channelId: string,
    name: string,
    topic: string,
    accessToken: string,
  ) {
    if (!channelId) {
      throw new BadRequestException(
        "Channel ID is required.",
      );
    }

    if (
      (!name || !name.trim()) &&
      topic === undefined
    ) {
      throw new BadRequestException(
        "Provide a channel name or topic to update.",
      );
    }

    const user =
      await this.getAuthenticatedUser(
        accessToken,
      );

    const supabase =
      this.getAuthenticatedClient(accessToken);

    await this.verifyAdminOrOwner(
      channelId,
      user.id,
      accessToken,
    );

    const {
      data: existingChannel,
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

    if (!existingChannel) {
      throw new NotFoundException(
        "Channel not found.",
      );
    }

    const updateData: {
      name?: string;
      topic?: string;
    } = {};

    if (name !== undefined) {
      if (!name.trim()) {
        throw new BadRequestException(
          "Channel name cannot be empty.",
        );
      }

      updateData.name = name.trim();
    }

    if (topic !== undefined) {
      updateData.topic =
        topic.trim();
    }

    const {
      data: updatedChannel,
      error: updateError,
    } = await supabase
      .from("channels")
      .update(updateData)
      .eq("id", channelId)
      .select()
      .single();

    if (updateError || !updatedChannel) {
      throw new BadRequestException(
        updateError?.message ??
          "Failed to update channel.",
      );
    }

    return {
      message:
        "Channel updated successfully.",
      channel: updatedChannel,
    };
  }

  /**
   * Remove a member from a channel.
   *
   * Owner/admin can kick another member.
   * A member can remove themselves.
   */
  async removeChannelMember(
    channelId: string,
    targetUserId: string,
    accessToken: string,
  ) {
    if (!channelId || !targetUserId) {
      throw new BadRequestException(
        "Channel ID and user ID are required.",
      );
    }

    const user =
      await this.getAuthenticatedUser(
        accessToken,
      );

    const supabase =
      this.getAuthenticatedClient(accessToken);

    const requester =
      await this.getChannelMemberRole(
        channelId,
        user.id,
        accessToken,
      );

    const {
      data: targetMember,
      error: targetError,
    } = await supabase
      .from("channel_members")
      .select(
        "id, user_id, role",
      )
      .eq("channel_id", channelId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (targetError) {
      throw new BadRequestException(
        targetError.message,
      );
    }

    if (!targetMember) {
      throw new NotFoundException(
        "User is not a member of this channel.",
      );
    }

    // A normal member can only leave themselves.
    if (
      targetUserId === user.id
    ) {
      if (targetMember.role === "owner") {
        throw new ForbiddenException(
          "The channel owner cannot leave the channel.",
        );
      }
    } else {
      // Kicking another user requires owner/admin.
      if (
        requester.role !== "owner" &&
        requester.role !== "admin"
      ) {
        throw new ForbiddenException(
          "Only the channel owner or an admin can remove members.",
        );
      }

      // Admins cannot kick owners or other admins.
      if (
        requester.role === "admin" &&
        (
          targetMember.role === "owner" ||
          targetMember.role === "admin"
        )
      ) {
        throw new ForbiddenException(
          "Admins can only remove regular members.",
        );
      }
    }

    const { error: deleteError } =
      await supabase
        .from("channel_members")
        .delete()
        .eq("channel_id", channelId)
        .eq("user_id", targetUserId);

    if (deleteError) {
      throw new BadRequestException(
        deleteError.message,
      );
    }

    return {
      message:
        targetUserId === user.id
          ? "You left the channel successfully."
          : "Member removed successfully.",
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

    const user =
      await this.getAuthenticatedUser(
        accessToken,
      );

    const supabase =
      this.getAuthenticatedClient(accessToken);

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

    const user =
      await this.getAuthenticatedUser(
        accessToken,
      );

    const supabase =
      this.getAuthenticatedClient(accessToken);

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

    await this.getChannelMemberRole(
      channelId,
      user.id,
      accessToken,
    );

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