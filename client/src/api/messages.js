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
