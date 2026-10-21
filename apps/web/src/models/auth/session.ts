import type { AccountIdentity } from '@perdiu/contracts'

export type AuthFailure =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'weak_password'
  | 'invalid_input'
  | 'rate_limited'
  | 'unavailable'

export class AuthGatewayError extends Error {
  constructor(readonly reason: AuthFailure) {
    super(reason)
  }
}

export class SessionRejected extends Error {}

export interface AuthGateway {
  restore(): Promise<{ session: boolean; link?: 'confirmed' | 'invalid' }>
  onSignedOut(listener: () => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<'signed_in' | 'confirmation_sent'>
  resendConfirmation(email: string): Promise<void>
  signOut(): Promise<void>
}

export interface AccountClient {
  me(): Promise<AccountIdentity>
  revokeSession(): Promise<void>
}
