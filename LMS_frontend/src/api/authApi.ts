import axios, { AxiosError, type AxiosResponse } from 'axios'
import api from './axios'
import { saveSession, type AuthUser } from './authSession'

interface SignInResponse {
  message: string
  data: AuthUser
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const configuredBase = import.meta.env.VITE_API_BASE_URL as string | undefined
  const authBase = (configuredBase || '').replace(/\/api\/?$/, '')
  let response: AxiosResponse<SignInResponse>
  try {
    response = await axios.post<SignInResponse>(`${authBase}/users/sign_in`, {
      user: { email, password },
    }, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 10000,
    })
  } catch (cause) {
    if (cause instanceof AxiosError) {
      const body = cause.response?.data as { error?: string; message?: string } | undefined
      throw new Error(body?.error || body?.message || 'Sign in failed. Check your email and password.', { cause })
    }
    throw cause
  }

  const authorization = response.headers.authorization as string | undefined
  const token = authorization?.replace(/^Bearer\s+/i, '').trim()
  const user = response.data.data
  if (!token || !user?.role) throw new Error('The login response was missing an authentication token or role.')

  saveSession({ token, user, role: user.role, email: user.email })
  api.defaults.headers.common.Authorization = `Bearer ${token}`
  return user
}
