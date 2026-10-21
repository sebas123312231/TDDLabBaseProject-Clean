import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import * as filterPresenterModule from '../../src/presenters/catalog/filters.presenter.js'
import {
  defaultSelection,
  FiltersPresenter,
  toReportFilters,
} from '../../src/presenters/catalog/filters.presenter.js'

test('inicia con todas las opciones de filtro seleccionadas', () => {
  const presenter = new FiltersPresenter()
  assert.deepEqual(presenter.getSnapshot(), {
    search: '',
    city: 'Todas las ciudades',
    category: 'Todas las categorías',
    status: 'Todos',
  })
})

test('buscar actualiza la selección y notifica el cambio', () => {
  let changed = ''
  const presenter = new FiltersPresenter((selection) => {
    changed = selection.search
  })
  presenter.setSearch('Luna')
  assert.equal(presenter.getSnapshot().search, 'Luna')
  assert.equal(changed, 'Luna')
})

test('suscriptores reciben cada cambio y dejan de recibirlo al darse de baja', () => {
  const presenter = new FiltersPresenter()
  const changes: string[] = []
  const unsubscribe = presenter.subscribe(() => changes.push(presenter.getSnapshot().search))
  presenter.setSearch('Luna')
  unsubscribe()
  presenter.setSearch('Milo')
  assert.deepEqual(changes, ['Luna'])
})

test('seleccionar una ciudad actualiza la selección', () => {
  const presenter = new FiltersPresenter()
  presenter.setCity('La Paz')
  assert.equal(presenter.getSnapshot().city, 'La Paz')
})

test('seleccionar una categoría actualiza la selección', () => {
  const presenter = new FiltersPresenter()
  presenter.setCategory('Mascota')
  assert.equal(presenter.getSnapshot().category, 'Mascota')
})

test('seleccionar perdido o encontrado actualiza el estado', () => {
  const presenter = new FiltersPresenter()
  presenter.setStatus('Encontrado')
  assert.equal(presenter.getSnapshot().status, 'Encontrado')
})

test('restablecer los filtros vuelve a los valores iniciales y notifica el cambio', () => {
  let changed: unknown
  const presenter = new FiltersPresenter((selection) => {
    changed = selection
  })
  presenter.setSearch('Luna')

  presenter.reset()

  const initial = {
    search: '',
    city: 'Todas las ciudades',
    category: 'Todas las categorías',
    status: 'Todos',
  }
  assert.deepEqual(presenter.getSnapshot(), initial)
  assert.deepEqual(changed, initial)
})

test('convierte las selecciones visibles en criterios del catálogo', () => {
  assert.deepEqual(
    toReportFilters({
      search: 'Luna',
      city: 'La Paz',
      category: 'Documentos',
      status: 'Encontrado',
    }),
    { text: 'Luna', city: 'La Paz', category: 'document', type: 'found' },
  )
})

test('omite los filtros que conservan su opción predeterminada', () => {
  assert.deepEqual(toReportFilters(defaultSelection), { text: '' })
})

test('expone las opciones de filtros del catálogo', () => {
  assert.deepEqual(filterPresenterModule.filterOptions, {
    cities: ['Todas las ciudades', 'La Paz', 'Cochabamba', 'Santa Cruz'],
    categories: ['Todas las categorías', 'Mascota', 'Objeto', 'Documentos'],
    statuses: [
      { value: 'Todos', label: 'Todos' },
      { value: 'Perdido', label: 'Perdidos' },
      { value: 'Encontrado', label: 'Encontrados' },
    ],
  })
})
