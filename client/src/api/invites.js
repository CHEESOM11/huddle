import { request } from './client'
import { getToken } from '../utils/storage'

// Generate a shareable invite link for a channel.
export async function createInvite(channelId) {
  const token = getToken()
  return request(`/api/channels/${channelId}/invite`, { method: 'POST', token })
}

// Public: fetch an invite's channel info so the join page can show the name.
export async function getInvite(code) {
  return request(`/api/invites/${code}`, { method: 'GET' })
}

// Redeem an invite link as the authenticated user.
export async function acceptInvite(code) {
  const token = getToken()
  return request(`/api/invites/${code}/accept`, { method: 'POST', token })
}
