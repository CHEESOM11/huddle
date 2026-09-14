import { request } from '../api/client'
import { getToken } from '../utils/storage'

const SUBSCRIBED_KEY = 'huddle_push_subscribed'

// Convert a base64url VAPID public key to a Uint8Array for pushManager.subscribe.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

// Register the service worker and subscribe to web push, if the browser
// supports it. Idempotent — we only prompt once per signed-in user.
export async function registerAndSubscribe() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null
  }

  const token = getToken()
  if (!token || localStorage.getItem(SUBSCRIBED_KEY) === token) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return null
    }

    const { publicKey } = await request('/api/notifications/vapid-public-key', {
      method: 'GET',
      token,
    })

    if (!publicKey) {
      return null
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    await request('/api/notifications/subscribe', {
      method: 'POST',
      token,
      body: { subscription: subscription.toJSON() },
    })

    localStorage.setItem(SUBSCRIBED_KEY, token)
    return subscription
  } catch {
    // Push is optional — never let a failure break the app.
    return null
  }
}
