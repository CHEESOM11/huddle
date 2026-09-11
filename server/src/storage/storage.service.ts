import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";


import { createClient, SupabaseClient } from "@supabase/supabase-js";


@Injectable()
export class StorageService {
  private getAuthenticatedClient(accessToken: string): SupabaseClient {
    if (!accessToken) {
      throw new UnauthorizedException("Authorization token is required.");
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
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      },
    );
  }
  async uploadFile(
    file: Express.Multer.File,
    channelId: string,
    accessToken: string,
  ) {
    if (!file) {
      throw new BadRequestException("File is required.");
    }
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

    // Check that the user belongs to the channel
    const { data: membership, error: membershipError } = await supabase
      .from("channel_members")
      .select("channel_id")
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError) {
      throw new BadRequestException(membershipError.message);
    }
    if (!membership) {
      throw new UnauthorizedException("You are not a member of this channel.");
    }

    // Create a unique storage path

    const fileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${channelId}/${user.id}/${Date.now()}-${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("huddle-files")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    if (uploadError) {
      throw new BadRequestException(uploadError.message);
    }
    return {
      file_path: filePath,
      file_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
    };
  }
}
