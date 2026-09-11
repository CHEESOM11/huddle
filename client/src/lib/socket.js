import { io } from 'socket.io-client'
import { getToken } from '../utils/storage'

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL ?? ''

let socket = null

// Lazily create a single shared socket, authenticated with the stored token.
// The backend gateway reads the token from `handshake.auth.token`.
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
    })
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
