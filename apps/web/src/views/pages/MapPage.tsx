import type { AppView } from '../../presenters/app/useApp.js'
import { filterOptions } from '../../presenters/catalog/filters.presenter.js'
import { MapView } from '../components/MapView.js'

export function MapPage({ app }: { app: AppView }) {
  const filters = app.actions.filters

  return (
    <section className="map-page">
      <p>Abre un punto para consultar un reporte. Las posiciones son ilustrativas, no representan ubicaciones geográficas.</p>
      <div className="filter-row" aria-label="Filtros del mapa">
        <label>Ciudad
          <select value={app.selection.city} onChange={(event) => filters.setCity(event.target.value)}>
            {filterOptions.cities.map((city) => <option key={city}>{city}</option>)}
          </select>
        </label>
        <label>Categoría
          <select value={app.selection.category} onChange={(event) => filters.setCategory(event.target.value)}>
            {filterOptions.categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label>Tipo
          <select value={app.selection.status} onChange={(event) => filters.setStatus(event.target.value as typeof app.selection.status)}>
            {filterOptions.statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </label>
        <span className="result-count"><b>{app.map.count}</b> reportes visibles</span>
      </div>
      <div className="map-layout">
        <MapView pins={app.map.pins} onOpen={app.actions.reports.open} />
        <div className="map-list" aria-label="Reportes del mapa">
          {app.map.list.map((report) => (
            <button key={report.id} className="map-result" onClick={() => app.actions.reports.open(report.id)}>
              <img src={report.image} alt="" />
              <span>
                <small>{report.status} · {report.category}</small>
                <b>{report.title}</b>
                <small>{report.zone}, {report.city}</small>
              </span>
            </button>
          ))}
          {app.map.count === 0 && <p>No hay reportes para estos filtros.</p>}
        </div>
      </div>
    </section>
  )
}
