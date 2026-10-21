import type { FilterSelection, FiltersPresenter } from '../../presenters/catalog/filters.presenter.js'

type ReportFiltersProps = {
  selection: FilterSelection
  options: { cities: readonly string[]; categories: readonly string[] }
  actions: Pick<FiltersPresenter, 'setSearch' | 'setCity' | 'setCategory'>
}

export function ReportFilters({ selection, options, actions }: ReportFiltersProps) {
  return (
    <>
      <input
        className="search-field"
        value={selection.search}
        onChange={(event) => actions.setSearch(event.target.value)}
        placeholder="Buscar por nombre o descripción"
        aria-label="Buscar reportes"
        maxLength={200}
      />
      <select
        className="select-field"
        value={selection.city}
        onChange={(event) => actions.setCity(event.target.value)}
        aria-label="Ciudad"
      >
        {options.cities.map((city) => <option key={city}>{city}</option>)}
      </select>
      <select
        className="select-field"
        value={selection.category}
        onChange={(event) => actions.setCategory(event.target.value)}
        aria-label="Categoría"
      >
        {options.categories.map((category) => <option key={category}>{category}</option>)}
      </select>
    </>
  )
}
