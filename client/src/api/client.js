const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function request(path, { method = 'POST', body, token } = {}) {
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

// Multipart upload for file attachments. The backend (`channels/:id/upload`)
// expects a single `file` field and responds with JSON, so we can't reuse
// the JSON-only `request()` helper here.
export async function uploadFile(path, file, { token } = {}) {
  const formData = new FormData()
  formData.append('file', file)

  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
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
