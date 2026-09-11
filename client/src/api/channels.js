import { request } from './client'
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
