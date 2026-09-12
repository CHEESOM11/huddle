import { request } from './client'
import { getToken } from '../utils/storage'

// Full-text search across the caller's channels. Each result carries the
// matched `content`, a `snippet`, the `channel` ({ id, name }) and the `author`.
export async function searchMessages(query) {
  const token = getToken()
  const data = await request(
    `/api/search?q=${encodeURIComponent(query)}`,
    { method: 'GET', token },
  )

  return data?.messages ?? []
}
