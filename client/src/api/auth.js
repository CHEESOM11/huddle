const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function request(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.'
    try {
      const data = await response.json()
      message = data?.message || data?.detail || data?.error || message
    } catch {
      // Non-JSON error response; keep generic message
    }
    throw new Error(message)
  }

  return response.json()
}

export function registerUser(payload) {
  return request('/api/auth/register', payload)
}

export function loginUser(payload) {
  return request('/api/auth/login', payload)
}

export function forgotPassword(payload) {
  return request('/api/auth/forgot-password', payload)
}