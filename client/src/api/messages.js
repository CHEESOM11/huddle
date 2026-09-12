import { request } from './client'
import { getToken } from '../utils/storage'

export async function fetchMessages(channelId) {
  const token = getToken()
  const data = await request(`/api/channels/${channelId}/messages`, {
    method: 'GET',
    token,
  })

  return data?.data ?? []
}

// REST send — an alternative to the socket `send_message` event. The workspace
// sends via the socket so messages broadcast live to the room (the gateway now
// accepts file fields too). Returns the created message, or null.
export async function sendMessage(channelId, { content, filePath, fileName, fileType, fileSize } = {}) {
  const token = getToken()
  const data = await request(`/api/channels/${channelId}/messages`, {
    method: 'POST',
    token,
    body: { content, filePath, fileName, fileType, fileSize },
  })

  return data?.data ?? null
}

// REST edit/delete exist on the backend but do NOT broadcast to the socket
// room; the UI uses the `edit_message`/`delete_message` socket events instead
// so other members see changes live. Kept here for completeness.
export async function editMessage(channelId, messageId, content) {
  const token = getToken()
  const data = await request(`/api/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    token,
    body: { content },
  })

  return data?.data ?? null
}

export async function deleteMessage(channelId, messageId) {
  const token = getToken()
  await request(`/api/channels/${channelId}/messages/${messageId}`, {
    method: 'DELETE',
    token,
  })
}

// Threads: replies to a parent message. The workspace sends replies via the
// `send_reply` socket event so they broadcast live to the channel room; these
// REST helpers are the read path and a fallback.
export async function fetchReplies(messageId) {
  const token = getToken()
  const data = await request(`/api/messages/${messageId}/replies`, {
    method: 'GET',
    token,
  })

  return data?.data ?? []
}

export async function sendReply(messageId, content) {
  const token = getToken()
  const data = await request(`/api/messages/${messageId}/replies`, {
    method: 'POST',
    token,
    body: { content },
  })

  return data?.data ?? null
}
