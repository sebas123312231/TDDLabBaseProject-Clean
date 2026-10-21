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
      <div className="page-intro">
        <p>Actividad de los reportes de demostración de la comunidad.</p>
        <button className="primary-button" onClick={() => onNavigate('publish')}>
          Nuevo reporte
        </button>
      </div>
      <section className="panel summary" aria-label="Resumen de reportes">
        <dl className="metrics">
          {overview.metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>
        <h2>Reportes activos por ciudad</h2>
        <ul className="city-list">
          {overview.cities.map((row) => (
            <li key={row.city}>
              {row.city}: <b>{row.count}</b>
            </li>
          ))}
        </ul>
      </section>
      <div className="section-heading"><h2>Reportes recientes</h2><button className="text-button" onClick={() => onNavigate('explore')}>Ver todos</button></div>
      <ReportGrid reports={overview.recent} isSaved={isSaved} onSave={onSave} onOpen={onOpen} />
      <p className="hint">Coordina la devolución en un lugar público y comparte tus datos solo cuando te sientas cómodo. <button className="text-button" onClick={() => onNavigate('safety')}>Ver recomendaciones</button></p>
    </>
  )
}
