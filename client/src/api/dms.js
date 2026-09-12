import { request } from './client'
import { getToken } from '../utils/storage'

// A conversation looks like:
// {
//   id, created_at,
//   members: [{ id, name, email, avatar_url }],
//   last_message: { id, conversation_id, user_id, content, created_at } | null
// }

export async function fetchConversations() {
  const token = getToken()
  const data = await request('/api/dms', { method: 'GET', token })
  return data?.conversations ?? []
}

// Find-or-create a conversation with the given users (the caller is always
// added server-side). Returns the full conversation.
export async function createConversation(userIds) {
  const token = getToken()
  const data = await request('/api/dms', {
    method: 'POST',
    token,
    body: { userIds },
  })

  return data?.conversation ?? null
}

export async function fetchDirectMessages(conversationId) {
  const token = getToken()
  const data = await request(`/api/dms/${conversationId}/messages`, {
    method: 'GET',
    token,
  })

  return data?.messages ?? []
}

// REST send — an alternative to the `send_dm` socket event. The workspace uses
// the socket so messages broadcast live to the `dm:<id>` room.
export async function sendDirectMessage(conversationId, content) {
  const token = getToken()
  const data = await request(`/api/dms/${conversationId}/messages`, {
    method: 'POST',
    token,
    body: { content },
  })

  return data?.data ?? null
}
