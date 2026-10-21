import { useSyncExternalStore } from 'react'
import type { Store } from './store.js'

export const useStore = <State>(store: Store<State>) =>
  useSyncExternalStore(store.subscribe, store.getSnapshot)
