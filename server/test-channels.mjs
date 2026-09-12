// Throwaway script: verify the RLS fix lets a normal (anon-key) user create a channel.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const BASE = 'http://localhost:4000';
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = Date.now().toString(36);
const email = `david.test+${stamp}@yopmail.com`;
const password = 'HuddlePass123!';
const channelName = `test-${stamp}`;

let userId = null;

try {
  // 1. Create a confirmed test user (service-role admin).
  const { data: u, error: ue } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Channel Tester' },
  });
  if (ue) throw new Error(`createUser: ${ue.message}`);
  userId = u.user.id;
  console.log('[1] user_created', email);

  // 2. Sign in through the real backend API to get an access token.
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await loginRes.json();
  console.log('[2] login', loginRes.status, loginBody?.message ?? JSON.stringify(loginBody));
  const token = loginBody?.session?.access_token;
  if (!token) throw new Error('login returned no access_token');

  // 3. Create a channel (the step that used to fail RLS).
  const createRes = await fetch(`${BASE}/api/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: channelName }),
  });
  const createBody = await createRes.json();
  console.log('[3] create_channel', createRes.status, JSON.stringify(createBody));
  if (!createRes.ok) throw new Error('create channel failed');

  // 4. List channels to confirm the new one is visible (SELECT policy).
  const listRes = await fetch(`${BASE}/api/channels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listBody = await listRes.json();
  const names = (listBody?.channels ?? []).map((m) => m?.channels?.name ?? m?.name);
  console.log('[4] list_channels', listRes.status, JSON.stringify(names));

  console.log('\nRESULT: channel creation SUCCEEDED');
} catch (err) {
  console.log('\nRESULT: channel creation FAILED →', err.message);
  process.exitCode = 1;
} finally {
  if (userId) {
    try { await admin.auth.admin.deleteUser(userId); console.log('[cleanup] deleted user', email); } catch {}
  }
}
