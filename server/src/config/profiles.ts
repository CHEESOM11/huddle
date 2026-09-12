import { SupabaseClient } from '@supabase/supabase-js';

// Resolve display names for a list of user ids in a single `profiles` query.
// Falls back to email, then null. Runs through the caller's *authenticated*
// client (so RLS applies), which makes it far cheaper than the service-role
// admin `getUserById` pattern it replaces — that fired one HTTP round trip
// per user (an N+1) and made message/member lists take seconds.
export async function getProfileNames(
  client: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string | null>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string | null>();

  if (unique.length === 0) {
    return map;
  }

  const { data, error } = await client
    .from('profiles')
    .select('id, name, email')
    .in('id', unique);

  if (error) {
    return map;
  }

  for (const profile of data ?? []) {
    map.set(
      profile.id,
      profile.name ?? profile.email ?? null,
    );
  }

  return map;
}
