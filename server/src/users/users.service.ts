import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { createClient } from "@supabase/supabase-js";

@Injectable()
export class UsersService {
  /**
   * Lists every profile the caller can see (all authenticated users can view
   * profiles via RLS), excluding the caller themselves. Powers the
   * "new direct message" user picker.
   */
  async getUsers(accessToken: string) {
    if (!accessToken) {
      throw new UnauthorizedException("Authorization token is required.");
    }

    const client = createClient(
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

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedException(
        "Invalid or expired authorization token.",
      );
    }

    const { data, error } = await client
      .from("profiles")
      .select("id, name, email, avatar_url")
      .neq("id", user.id)
      .order("name", { ascending: true });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      users: data ?? [],
    };
  }
}
