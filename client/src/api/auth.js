import { getToken } from '../utils/storage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function request(path, { method = 'POST', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.'
    try {
      const data = await response.json()
      message = data?.message || data?.error || message
    } catch {
      // Non-JSON error response; keep generic message
    }

    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.json()
}

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