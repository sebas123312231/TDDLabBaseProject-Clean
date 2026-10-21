import type { AuthMode } from '../auth/auth-form.presenter.js'
import type { AuthPresenter } from '../auth/auth.presenter.js'
import type { Effects } from '../effects.js'
import { Store } from '../store.js'
import type { Section } from './sections.js'

export interface ShellState {
  section: Section
  authView: AuthMode | null
  pendingSection: Section | null
  menuOpen: boolean
  signingOut: boolean
}

interface Dependencies {
  auth: Pick<AuthPresenter, 'access'>
  effects: Pick<Effects, 'scrollToTop'>
}

export class ShellPresenter extends Store<ShellState> {
  constructor(private readonly dependencies: Dependencies) {
    super({ section: 'overview', authView: null, pendingSection: null, menuOpen: false, signingOut: false })
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
  closeAuth = () =>
    this.setState({ ...this.state, authView: null, pendingSection: null, section: 'explore' })
}
