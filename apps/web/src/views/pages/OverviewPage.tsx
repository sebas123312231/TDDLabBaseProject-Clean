import type { AppView } from '../../presenters/app/useApp.js'
import type { Section } from '../../presenters/app/sections.js'
import { ReportGrid } from '../components/ReportGrid.js'

type OverviewPageProps = {
  overview: AppView['overview']
  onNavigate: (section: Section) => void
  isSaved: AppView['isSaved']
  onSave: AppView['actions']['reports']['toggleSaved']
  onOpen: AppView['actions']['reports']['open']
}

export function OverviewPage({ overview, onNavigate, isSaved, onSave, onOpen }: OverviewPageProps) {
  return (
    <>
      <p className="page-description">Actividad de los reportes de demostración de la comunidad.</p>
      <div className="metric-grid" aria-label="Resumen de reportes">
        {overview.metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span><strong>{metric.value}</strong>
          </article>
        ))}
      </div>
      <section className="city-list" aria-labelledby="city-list-title">
        <h2 id="city-list-title">Reportes activos por ciudad</h2>
        <ul>{overview.cities.map((row) => <li key={row.city}>{row.city}: <b>{row.count}</b></li>)}</ul>
      </section>
      <div className="section-heading"><h2>Reportes recientes</h2><button className="text-button" onClick={() => onNavigate('explore')}>Ver todos</button></div>
      <ReportGrid reports={overview.recent} isSaved={isSaved} onSave={onSave} onOpen={onOpen} />
      <p className="hint">Coordina la devolución en un lugar público y comparte tus datos solo cuando te sientas cómodo. <button className="text-button" onClick={() => onNavigate('safety')}>Ver recomendaciones</button></p>
      <button className="primary-button" onClick={() => onNavigate('publish')}>Nuevo reporte</button>
    </>
  )
}
