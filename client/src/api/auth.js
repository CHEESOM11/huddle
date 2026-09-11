import { request } from './client'
import { getToken } from '../utils/storage'

export function registerUser(payload) {
  return request('/api/auth/register', { body: payload })
}

export function loginUser(payload) {
  return request('/api/auth/login', { body: payload })
}

export function forgotPassword(payload) {
  return request('/api/auth/forgot-password', { body: payload })
}

export async function getCurrentSession() {
  const token = getToken()

  if (!token) {
    return { user: null, error: false }
  }

  try {
    const data = await request('/api/auth/me', { method: 'GET', token })
    return { user: data?.user ?? null, error: false }
  } catch (error) {
    if (error?.status) {
      return { user: null, error: false }
    }

    return { user: null, error: true }
  }
}