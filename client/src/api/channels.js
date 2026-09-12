import { request, uploadFile } from './client'
import { getToken } from '../utils/storage'

// The backend nests channel data in the list response: each row is
// `{ channel_id, channels: { id, name, created_by, created_at } }`.
// Normalize both the list and create responses to a single flat shape.
function normalizeChannel(channel) {
  return {
    id: channel.id,
    name: channel.name,
    createdBy: channel.created_by,
    createdAt: channel.created_at,
  }
}

export async function fetchChannels() {
  const token = getToken()
  const data = await request('/api/channels', { method: 'GET', token })

  return (data?.channels ?? []).map((member) => normalizeChannel(member.channels))
}

export async function createChannel(name) {
  const token = getToken()
  const data = await request('/api/channels', {
    method: 'POST',
    token,
    body: { name },
  })

  return normalizeChannel(data.channel)
}

export async function deleteChannel(channelId) {
  const token = getToken()
  await request(`/api/channels/${channelId}`, { method: 'DELETE', token })
}

// Fetch the member list + count for a channel's header (people badge).
export async function getChannelMembers(channelId) {
  const token = getToken()
  const data = await request(`/api/channels/${channelId}/members`, {
    method: 'GET',
    token,
  })

  return {
    memberCount: data?.memberCount ?? 0,
    members: data?.members ?? [],
  }
}

// Upload a file to the channel's storage bucket; returns the file metadata
// needed to attach it to a message via POST /channels/:id/messages.
export async function uploadChannelFile(channelId, file) {
  const token = getToken()
  return uploadFile(`/api/channels/${channelId}/upload`, file, { token })
}

// Directly join a channel by id (no invite code). Mirrors POST /channels/:id/join.
export async function joinChannel(channelId) {
  const token = getToken()
  return request(`/api/channels/${channelId}/join`, { method: 'POST', token })
}

// Resolve a stored file path into a short-lived, signed download URL.
export async function getChannelFileUrl(channelId, path) {
  const token = getToken()
  const data = await request(
    `/api/channels/${channelId}/file?path=${encodeURIComponent(path)}`,
    { method: 'GET', token },
  )

  return data?.url ?? null
}
