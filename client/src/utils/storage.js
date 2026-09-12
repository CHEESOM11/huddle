const ONBOARDING_KEY = 'huddle_hasSeenOnboarding'
const TOKEN_KEY = 'huddle_access_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function hasSeenOnboarding() {
  return localStorage.getItem(ONBOARDING_KEY) === '1'
}

export function setOnboardingSeen() {
  localStorage.setItem(ONBOARDING_KEY, '1')
}