import { createPresenters } from './dependencies.js'
import { useApp } from '../presenters/app/useApp.js'
import { AppShell } from '../views/layouts/AppShell.js'

const presenters = createPresenters()

export function App() {
  return <AppShell app={useApp(presenters)} />
}
