import { request } from './client'
import { getToken } from '../utils/storage'

// List other users (profiles) to power the "new direct message" picker.
// Excludes the current user on the backend.
export async function fetchUsers() {
  const token = getToken()
  const data = await request('/api/users', { method: 'GET', token })
  return data?.users ?? []
}
