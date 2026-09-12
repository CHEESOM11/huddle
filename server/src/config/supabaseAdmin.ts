import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// Resolve a user's display name from their Auth metadata. Falls back to
// email, then null. Uses the service-role client (GoTrue admin API) so it
// works for any user, not just the caller.
export async function getUserDisplayName(
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (error || !data?.user) {
      return null;
    }

    const meta =
      (data.user.user_metadata ?? {}) as Record<string, unknown>;

    return (
      (meta.name as string) ??
      (meta.full_name as string) ??
      data.user.email ??
      null
    );
  } catch {
    return null;
  }
}

// Batch-resolve display names for a list of user ids. Returns a map so
// callers can attach `sender_name` / `name` to rows without N round-trips
// per call site.
export async function getUserDisplayNames(
  userIds: string[],
): Promise<Map<string, string | null>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string | null>();

  await Promise.all(
    unique.map(async (id) => {
      map.set(id, await getUserDisplayName(id));
    }),
  );

  return map;
}