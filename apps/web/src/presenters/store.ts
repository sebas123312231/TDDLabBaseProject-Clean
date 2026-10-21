export class Store<State> {
  private listeners = new Set<() => void>()
  constructor(protected state: State) {}

  getSnapshot = () => this.state

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  protected setState(state: State) {
    this.state = state
    this.listeners.forEach((listener) => listener())
  }
}
