import { AuthClient, isAuthApiError, type AuthError } from '@supabase/auth-js'
import { AuthGatewayError, type AuthFailure, type AuthGateway } from '../../models/auth/session.js'

const failureReasons: Partial<Record<string, AuthFailure>> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  weak_password: 'weak_password',
  validation_failed: 'invalid_input',
  email_address_invalid: 'invalid_input',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
}

function rejectProviderError(error: AuthError): never {
  const reason = isAuthApiError(error) ? failureReasons[error.code ?? ''] : undefined
  throw new AuthGatewayError(reason ?? (error.status === 429 ? 'rate_limited' : 'unavailable'))
}

export function createAuthGateway(
  baseUrl: string,
  location = window.location,
): { gateway: AuthGateway; accessToken: () => Promise<string | undefined> } {
  const url = new URL(baseUrl.replace(/\/$/, ''), location.origin).href
  const client = new AuthClient({
    url,
    storageKey: 'perdiu-auth',
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  })
  const accessToken = async () => (await client.getSession()).data.session?.access_token

  const gateway: AuthGateway = {
    async restore() {
      const params = new URLSearchParams(location.search)
      const failedLink = params.has('error') || params.has('error_description')
      const callback = failedLink || params.has('code')
      await client.initialize()
      if (callback) {
        for (const key of ['code', 'error', 'error_code', 'error_description']) params.delete(key)
        const search = params.size ? `?${params}` : ''
        window.history.replaceState(null, '', `${location.pathname}${search}${location.hash}`)
      }
      const session = Boolean(await accessToken())
      if (!callback) return { session }
      return { session, link: failedLink ? 'invalid' : 'confirmed' }
    },
    onSignedOut(listener) {
      const { data } = client.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') setTimeout(listener, 0)
      })
      return () => data.subscription.unsubscribe()
    },
    async signIn(email, password) {
      const { error } = await client.signInWithPassword({ email, password })
      if (error) rejectProviderError(error)
    },
    async signUp(email, password) {
      const { data, error } = await client.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/` },
      })
      if (error) rejectProviderError(error)
      return data.session ? 'signed_in' : 'confirmation_sent'
    },
    async resendConfirmation(email) {
      const { error } = await client.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${location.origin}/` },
      })
      if (error) rejectProviderError(error)
    },
    async signOut() {
      const token = await accessToken()
      if (token) {
        const response = await fetch(`${url}/logout?scope=local`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => undefined)
        if (!response || (!response.ok && ![401, 403, 404].includes(response.status)))
          throw new AuthGatewayError('unavailable')
      }
      const { error } = await client.signOut({ scope: 'local' })
      if (error) rejectProviderError(error)
    },
  }
  return { gateway, accessToken }
}
