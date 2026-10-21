import type { AppView } from '../../presenters/app/useApp.js'
import { ExplorePage } from './ExplorePage.js'
import { MapPage } from './MapPage.js'
import { MyReportsPage } from './MyReportsPage.js'
import { OverviewPage } from './OverviewPage.js'
import { ProfilePage } from './ProfilePage.js'
import { PublishPage } from './PublishPage.js'
import { SavedPage } from './SavedPage.js'
import { SafetyPage } from './SafetyPage.js'

export function SectionContent({ app }: { app: AppView }) {
  const { section } = app.shell

  if (section === 'overview')
    return <OverviewPage app={app} />

  if (section === 'explore')
    return (
      <ExplorePage
        catalog={app.catalog}
        selection={app.selection}
        filters={app.actions.filters}
        onRetry={app.actions.retryCatalog}
        isSaved={app.isSaved}
        onSave={app.actions.reports.toggleSaved}
        onOpen={app.actions.reports.open}
      />
    )

  if (section === 'map')
    return <MapPage app={app} />

  if (section === 'publish')
    return <PublishPage app={app} />

  if (section === 'my-reports')
    return <MyReportsPage app={app} />

  if (section === 'saved')
    return (
      <SavedPage
        reports={app.saved}
        isSaved={app.isSaved}
        onSave={app.actions.reports.toggleSaved}
        onOpen={app.actions.reports.open}
        onNavigate={app.actions.navigate}
      />
    )

  if (section === 'profile')
    return <ProfilePage app={app} />

  if (section === 'safety')
    return <SafetyPage />

  return null
}
