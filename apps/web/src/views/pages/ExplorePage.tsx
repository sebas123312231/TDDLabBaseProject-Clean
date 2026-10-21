import type { AppView } from '../../presenters/app/useApp.js'
import type { Section } from '../../presenters/app/sections.js'
import {
  filterOptions,
  type FilterSelection,
  type FiltersPresenter,
} from '../../presenters/catalog/filters.presenter.js'
import { EmptyState } from '../components/EmptyState.js'
import { ReportFilters } from '../components/ReportFilters.js'
import { ReportGrid } from '../components/ReportGrid.js'
import { StatusTabs } from '../components/StatusTabs.js'

type ExplorePageProps = {
  catalog: AppView['catalog']
  selection: FilterSelection
  filters: Pick<FiltersPresenter, 'setSearch' | 'setCity' | 'setCategory' | 'setStatus' | 'reset'>
  onRetry: () => void
  isSaved: AppView['isSaved']
  onSave: (id: string) => void
  onOpen: (id: string) => void
  onNavigate: (section: Section) => void
}

export function ExplorePage({ catalog, selection, filters, onRetry, isSaved, onSave, onOpen, onNavigate }: ExplorePageProps) {
  return (
    <>
      <div className="page-intro">
        <p>Busca por palabra, ciudad o categoría.</p>
        <button className="primary-button" onClick={() => onNavigate('publish')}>
          Publicar reporte
        </button>
      </div>
      <div className="filter-row">
        <ReportFilters
          selection={selection}
          options={filterOptions}
          actions={filters}
        />
        <StatusTabs
          label="Estado del reporte"
          options={filterOptions.statuses}
          value={selection.status}
          onChange={filters.setStatus}
        />
        <button className="secondary-button" onClick={filters.reset}>Limpiar filtros</button>
      </div>
      {catalog.status === 'loading' && <p role="status">Cargando reportes…</p>}
      {catalog.status === 'error' && <div role="alert"><p>{catalog.message}</p><button className="secondary-button" onClick={onRetry}>Reintentar</button></div>}
      {catalog.limitReached && (
        <p className="hint" role="status">
          Se muestran hasta {catalog.limit} resultados. Ajusta los filtros para precisar la búsqueda.
        </p>
      )}
      {catalog.status === 'ready' && <>
        <p>{catalog.count} resultados</p>
        {catalog.count ? (
          <ReportGrid reports={catalog.reports} isSaved={isSaved} onSave={onSave} onOpen={onOpen} />
        ) : (
          <EmptyState
            title={catalog.empty.title}
            description={catalog.empty.description}
            action="Publicar reporte"
            onAction={() => onNavigate('publish')}
          />
        )}
      </>}
    </>
  )
}
