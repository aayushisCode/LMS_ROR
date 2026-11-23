export interface AuthUser {
  id: string | number
  email: string
  role: string
}

export interface AuthSession {
  token: string
  user: AuthUser
  role: string
  email: string
}

const SESSION_KEY = 'lms_session'

export function saveSession(session: AuthSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getSession(): AuthSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function getToken(): string | null {
  return getSession()?.token ?? null
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
