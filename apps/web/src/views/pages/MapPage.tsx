import type { AppView } from '../../presenters/app/useApp.js'
import type { Section } from '../../presenters/app/sections.js'
import {
  filterOptions,
  type FilterSelection,
  type FiltersPresenter,
} from '../../presenters/catalog/filters.presenter.js'
import { EmptyState } from '../components/EmptyState.js'
import { MapView } from '../components/MapView.js'
import { PageHeading } from '../components/PageHeading.js'
import { ReportFilters } from '../components/ReportFilters.js'
import { StatusTabs } from '../components/StatusTabs.js'

type MapPageProps = {
  map: AppView['map']
  selection: FilterSelection
  filters: Pick<FiltersPresenter, 'setSearch' | 'setCity' | 'setCategory' | 'setStatus'>
  onOpen: (id: string) => void
  onNavigate: (section: Section) => void
}

export function MapPage({ map, selection, filters, onOpen, onNavigate }: MapPageProps) {
  return (
    <>
      <PageHeading
        title="Mapa de reportes"
        description="Ubica reportes cercanos y abre cada punto para ver sus detalles."
        action={
          <button className="primary-button" onClick={() => onNavigate('publish')}>
            Nuevo reporte
          </button>
        }
      />
      <div className="filter-row" aria-label="Filtros del mapa">
        <ReportFilters
          selection={selection}
          options={filterOptions}
          actions={filters}
          withSearch={false}
        />
        <StatusTabs
          label="Estado del reporte"
          options={filterOptions.statuses}
          value={selection.status}
          onChange={filters.setStatus}
        />
        <span className="result-count"><b>{map.count}</b> reportes visibles</span>
      </div>
      <div className="map-layout">
        <MapView pins={map.pins} onOpen={onOpen} />
        <div className="map-list" aria-label="Reportes del mapa">
          {map.list.map((report) => (
            <button key={report.id} className="map-result" onClick={() => onOpen(report.id)}>
              <img src={report.image} alt="" />
              <span>
                <small>{report.status} · {report.category}</small>
                <b>{report.title}</b>
                <small>{report.zone}, {report.city}</small>
              </span>
            </button>
          ))}
          {map.count === 0 && (
            <EmptyState
              title="No hay reportes en esta zona"
              description="Cambia los filtros o crea un reporte nuevo."
              action="Publicar reporte"
              onAction={() => onNavigate('publish')}
            />
          )}
        </div>
      </div>
    </>
  )
}
