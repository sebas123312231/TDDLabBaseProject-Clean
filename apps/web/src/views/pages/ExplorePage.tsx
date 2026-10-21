import type { AppView } from '../../presenters/app/useApp.js'
import { filterOptions } from '../../presenters/catalog/filters.presenter.js'
import { ReportGrid } from '../components/ReportGrid.js'

type ExplorePageProps = {
  catalog: AppView['catalog']
  selection: AppView['selection']
  filters: AppView['actions']['filters']
  onRetry: AppView['actions']['retryCatalog']
  isSaved: AppView['isSaved']
  onSave: AppView['actions']['reports']['toggleSaved']
  onOpen: AppView['actions']['reports']['open']
}

export function ExplorePage({ catalog, selection, filters, onRetry, isSaved, onSave, onOpen }: ExplorePageProps) {
  return (
    <>
      <p>Busca por palabra, ciudad o categoría.</p>
      <div className="filter-row">
        <label>Buscar<input value={selection.search} onChange={(event) => filters.setSearch(event.target.value)} /></label>
        <label>Ciudad<select value={selection.city} onChange={(event) => filters.setCity(event.target.value)}>{filterOptions.cities.map((city) => <option key={city}>{city}</option>)}</select></label>
        <label>Categoría<select value={selection.category} onChange={(event) => filters.setCategory(event.target.value)}>{filterOptions.categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Tipo<select value={selection.status} onChange={(event) => filters.setStatus(event.target.value as typeof selection.status)}>{filterOptions.statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
        <button className="secondary-button" onClick={filters.reset}>Limpiar</button>
      </div>
      {catalog.status === 'loading' && <p role="status">Cargando reportes…</p>}
      {catalog.status === 'error' && <div role="alert"><p>{catalog.message}</p><button className="secondary-button" onClick={onRetry}>Reintentar</button></div>}
      {catalog.status === 'ready' && <>
        <p>{catalog.count} resultados</p>
        {catalog.count ? (
          <ReportGrid reports={catalog.reports} isSaved={isSaved} onSave={onSave} onOpen={onOpen} />
        ) : <p>{catalog.empty.title}. {catalog.empty.description}</p>}
      </>}
    </>
  )
}
