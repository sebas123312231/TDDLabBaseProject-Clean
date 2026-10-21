import type { AppView } from '../../presenters/app/useApp.js'
import { ReportGrid } from '../components/ReportGrid.js'

export function OverviewPage({ app }: { app: AppView }) {
  const cards = {
    isSaved: app.isSaved,
    onSave: app.actions.reports.toggleSaved,
    onOpen: app.actions.reports.open,
  }
  return (
    <>
      <p className="page-description">Actividad de los reportes de demostración de la comunidad.</p>
      <div className="metric-grid" aria-label="Resumen de reportes">
        {app.overview.metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span><strong>{metric.value}</strong>
          </article>
        ))}
      </div>
      <section className="city-list" aria-labelledby="city-list-title">
        <h2 id="city-list-title">Reportes activos por ciudad</h2>
        <ul>{app.overview.cities.map((row) => <li key={row.city}>{row.city}: <b>{row.count}</b></li>)}</ul>
      </section>
      <div className="section-heading"><h2>Reportes recientes</h2><button className="text-button" onClick={() => app.actions.navigate('explore')}>Ver todos</button></div>
      <ReportGrid reports={app.overview.recent} {...cards} />
      <p className="hint">Coordina la devolución en un lugar público y comparte tus datos solo cuando te sientas cómodo. <button className="text-button" onClick={() => app.actions.navigate('safety')}>Ver recomendaciones</button></p>
      <button className="primary-button" onClick={() => app.actions.navigate('publish')}>Nuevo reporte</button>
    </>
  )
}
