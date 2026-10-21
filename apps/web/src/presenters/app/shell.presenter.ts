import type { AccountIdentity } from '@perdiu/contracts'
import type { AuthMode } from '../auth/auth-form.presenter.js'
import { signedOutNotice, type AuthPresenter } from '../auth/auth.presenter.js'
import type { Effects } from '../effects.js'
import { Store } from '../store.js'
import type { NoticePresenter } from './notice.presenter.js'
import { sectionLabels, type Section } from './sections.js'

export interface ShellState {
  section: Section
  authView: AuthMode | null
  pendingSection: Section | null
  menuOpen: boolean
  signingOut: boolean
}

export interface AccountView {
  name: string
  email: string
  photoUrl?: string
}

export const toAccountView = (account: AccountIdentity): AccountView => ({
  name: account.displayName ?? account.email.split('@')[0]!,
  email: account.email,
  ...(account.photoUrl ? { photoUrl: account.photoUrl } : {}),
})

interface Dependencies {
  auth: Pick<AuthPresenter, 'getSnapshot' | 'access' | 'subscribe' | 'start' | 'signOut'>
  effects: Pick<Effects, 'scrollToTop' | 'onPageRestored' | 'reload'>
  notices: Pick<NoticePresenter, 'show'>
  onSignedOut: () => void
}

export class ShellPresenter extends Store<ShellState> {
  constructor(private readonly dependencies: Dependencies) {
    super({ section: 'overview', authView: null, pendingSection: null, menuOpen: false, signingOut: false })
  }

  start = () => {
    const { auth, effects } = this.dependencies
    const unsubscribe = auth.subscribe(this.followSession)
    const stopWatching = effects.onPageRestored(() => effects.reload())
    void auth.start()
    return () => {
      unsubscribe()
      stopWatching()
    }
  }

  private followSession = () => {
    const { auth } = this.dependencies
    const session = auth.getSnapshot()
    if (session.status === 'authenticated') {
      if (this.state.authView)
        this.setState({
          ...this.state,
          authView: null,
          section: this.state.pendingSection ?? 'overview',
          pendingSection: null,
        })
      return
    }
    if (session.status === 'anonymous' && session.notice === signedOutNotice) return
    if (auth.access(this.state.section) === 'login') {
      const section = this.state.section
      this.setState({ ...this.state, section: 'overview', pendingSection: section, authView: 'login' })
      return
    }
    if (session.status === 'anonymous' && session.notice && !this.state.authView)
      this.setState({ ...this.state, authView: 'login' })
  }

  navigate = (section: Section) => {
    if (this.dependencies.auth.access(section) === 'login') {
      this.setState({ ...this.state, pendingSection: section, authView: 'login', menuOpen: false })
      return
    }
    this.setState({ ...this.state, section, menuOpen: false })
    this.dependencies.effects.scrollToTop()
  }

  openMenu = () => this.setState({ ...this.state, menuOpen: true })
  closeMenu = () => this.setState({ ...this.state, menuOpen: false })
  openAuth = (mode: AuthMode) =>
    this.setState({ ...this.state, pendingSection: null, authView: mode, menuOpen: false })
  switchAuthMode = (mode: AuthMode) => this.setState({ ...this.state, authView: mode })
  closeAuth = () =>
    this.setState({ ...this.state, authView: null, pendingSection: null, section: 'explore' })

  signOut = async () => {
    if (this.state.signingOut) return
    this.setState({ ...this.state, signingOut: true })
    const failure = await this.dependencies.auth.signOut()
    if (failure) {
      this.setState({ ...this.state, signingOut: false })
      this.dependencies.notices.show(failure, true)
      return
    }
    this.dependencies.onSignedOut()
    this.setState({ ...this.state, signingOut: false, section: 'explore', menuOpen: false })
    this.dependencies.notices.show(signedOutNotice)
  }

  view = () => {
    const session = this.dependencies.auth.getSnapshot()
    return {
      title: sectionLabels[this.state.section],
      access: this.dependencies.auth.access(this.state.section),
      account: session.status === 'authenticated' ? toAccountView(session.user) : null,
      restoring: session.status === 'restoring',
      authNotice: session.status === 'anonymous' ? session.notice : undefined,
    }
  }
}
