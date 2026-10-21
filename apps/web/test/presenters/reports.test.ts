import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { CatalogReport, DemoReport } from '../../src/models/reports/report.js'
import { defaultSelection } from '../../src/presenters/catalog/filters.presenter.js'
import { ReportsPresenter } from '../../src/presenters/reports/reports.presenter.js'

const base = {
  type: 'lost' as const,
  state: 'active' as const,
  category: 'pet' as const,
  description: 'Descripción de prueba suficientemente larga.',
  city: 'La Paz',
  zone: 'Sopocachi',
  incidentDate: '2026-10-06',
  createdAt: '2026-10-06T14:00:00.000Z',
  imageUrls: [],
}
const demo = (id: string, overrides: Partial<DemoReport> = {}): DemoReport => ({
  ...base,
  id,
  source: 'demo',
  title: 'Reporte ' + id,
  author: { id: 'community-owner', displayName: 'Mariana Rojas' },
  phone: '59170000001',
  position: { top: '30%', left: '28%' },
  ...overrides,
})
const own = (id: string, overrides: Partial<DemoReport> = {}) =>
  demo(id, {
    author: { id: 'demo-owner', displayName: 'Santiago Demo' },
    ...overrides,
  })
const catalogReport: CatalogReport = {
  ...base,
  id: 'catalog-1',
  source: 'catalog',
  title: 'Mochila azul encontrada',
  type: 'found',
  category: 'object',
  author: { id: 'owner-1', displayName: 'Santiago Demo' },
}

function setup(reports: DemoReport[] = [], saved: string[] = []) {
  const notices: string[] = []
  const opened: [string, string][] = []
  const presenter = new ReportsPresenter(
    reports,
    {
      catalog: { find: (id) => (id === catalogReport.id ? catalogReport : undefined) },
      notices: { show: (message) => notices.push(message) },
      effects: { openWhatsApp: (phone, message) => opened.push([phone, message]) },
    },
    saved,
  )
  return { presenter, notices, opened }
}

test('inicia reportes comunitarios, guardados y selección en estado vacío', () => {
  const presenter = new ReportsPresenter([], {
    catalog: { find: () => undefined },
    notices: { show: () => {} },
    effects: { openWhatsApp: () => {} },
  })

  assert.deepEqual(presenter.getSnapshot(), {
    reports: [],
    saved: [],
    savedCatalog: [],
    selected: null,
    ownFilter: 'Todos',
  })
})

test('guarda reportes del catálogo y comunitarios y avisa al agregar o quitar', () => {
  const { presenter, notices } = setup([demo('demo-1')])
  presenter.toggleSaved(catalogReport.id)
  presenter.toggleSaved('demo-1')
  assert.deepEqual(presenter.saved().map(({ id }) => id), ['catalog-1', 'demo-1'])
  assert.equal(presenter.isSaved(catalogReport.id), true)

  presenter.toggleSaved(catalogReport.id)

  assert.deepEqual(presenter.saved().map(({ id }) => id), ['demo-1'])
  assert.deepEqual(notices, [
    'Guardaste este reporte para revisarlo después.',
    'Guardaste este reporte para revisarlo después.',
    'Quitaste este reporte de tus guardados.',
  ])
})

test('el detalle separa contacto de reportes comunitarios y gestión de reportes propios', () => {
  const { presenter, opened } = setup([demo('community-1'), own('own-1')])

  presenter.open('community-1')
  assert.equal(presenter.detail()?.canContact, true)
  assert.equal(presenter.detail()?.canResolve, false)
  presenter.contact('community-1')
  assert.deepEqual(opened, [
    ['59170000001', 'Hola, vi tu reporte "Reporte community-1" en PerdiU. ¿Podemos coordinar?'],
  ])

  presenter.open('own-1')
  assert.equal(presenter.detail()?.canContact, false)
  assert.equal(presenter.detail()?.canResolve, true)

  presenter.open(catalogReport.id)
  assert.equal(presenter.detail()?.canContact, false)
  assert.equal(presenter.detail()?.canResolve, false)
  assert.equal(presenter.detail()?.card.person, 'Santiago Demo')

  presenter.close()
  assert.equal(presenter.detail(), null)
})

test('solo permite resolver un reporte propio activo', () => {
  const { presenter, notices } = setup([own('own-1'), demo('community-1')])
  presenter.resolve('community-1')
  assert.equal(presenter.getSnapshot().reports[1]?.state, 'active')
  assert.deepEqual(notices, [])

  presenter.open('own-1')
  presenter.resolve('own-1')

  assert.equal(presenter.getSnapshot().reports[0]?.state, 'resolved')
  assert.equal(presenter.detail()?.card.badge, 'Resuelto')
  assert.deepEqual(notices, [
    'Marcaste el reporte como resuelto; ya no aparecerá en las búsquedas.',
  ])
})

test('solo elimina reportes propios y limpia guardado y detalle al quitarlos', () => {
  const { presenter, notices } = setup([own('own-1'), demo('community-1')])
  presenter.toggleSaved('own-1')
  presenter.open('own-1')

  presenter.remove('community-1')
  assert.equal(presenter.getSnapshot().reports.length, 2)
  presenter.remove('own-1')

  assert.deepEqual(presenter.getSnapshot().reports.map(({ id }) => id), ['community-1'])
  assert.deepEqual(presenter.getSnapshot().saved, [])
  assert.equal(presenter.detail(), null)
  assert.deepEqual(notices, [
    'Guardaste este reporte para revisarlo después.',
    'El reporte se quitó de la lista.',
  ])
})

test('filtra mis reportes por estado y cuenta solo los propios', () => {
  const { presenter } = setup(
    [own('active'), own('resolved', { state: 'resolved' }), demo('community-1')],
    ['active'],
  )
  assert.deepEqual(
    {
      total: presenter.myReports().total,
      active: presenter.myReports().active,
      ids: presenter.myReports().cards.map(({ id }) => id),
      counts: presenter.counts(),
    },
    { total: 2, active: 1, ids: ['active', 'resolved'], counts: { own: 2, saved: 1 } },
  )

  presenter.setOwnFilter('Resueltos')
  assert.deepEqual(
    {
      filter: presenter.myReports().filter,
      ids: presenter.myReports().cards.map(({ id }) => id),
      empty: presenter.myReports().empty.title,
    },
    {
      filter: 'Resueltos',
      ids: ['resolved'],
      empty: 'Todavía no tienes reportes resueltos',
    },
  )
})

test('prepara métricas, distribución por ciudad y tres reportes recientes', () => {
  const { presenter } = setup([
    own('lost-1'),
    demo('found-1', { type: 'found', city: 'Cochabamba' }),
    demo('resolved-1', { state: 'resolved' }),
    demo('found-other', { type: 'found', city: 'Tarija' }),
  ])

  const overview = presenter.overview()

  assert.deepEqual(overview.metrics, [
    { label: 'Reportes activos', value: 3 },
    { label: 'Perdidos', value: 1 },
    { label: 'Encontrados', value: 2 },
    { label: 'Resueltos', value: 1 },
  ])
  assert.deepEqual(overview.cities, [
    { city: 'La Paz', count: 1 },
    { city: 'Cochabamba', count: 1 },
    { city: 'Santa Cruz', count: 0 },
    { city: 'Otras ciudades', count: 1 },
  ])
  assert.deepEqual(overview.recent.map(({ id }) => id), ['lost-1', 'found-1', 'found-other'])
})

test('filtra reportes del mapa y numera sus pines visibles', () => {
  const { presenter } = setup([
    demo('lost-1', { zone: 'Sopocachi' }),
    demo('found-1', { type: 'found', category: 'object', zone: 'Miraflores' }),
  ])

  const view = presenter.mapView({
    ...defaultSelection,
    search: 'MIRAFLÓRES',
    category: 'Objeto',
    status: 'Encontrado',
  })

  assert.equal(view.count, 1)
  assert.deepEqual(view.pins, [
    {
      id: 'found-1',
      label: 'Ver Reporte found-1',
      tone: 'found',
      top: '30%',
      left: '28%',
      number: 1,
    },
  ])
  assert.deepEqual(view.list.map(({ id }) => id), ['found-1'])
})

test('limpia selección y guardados al cerrar la sesión sin borrar reportes de demostración', () => {
  const { presenter } = setup([own('own-1')], ['own-1'])
  presenter.toggleSaved(catalogReport.id)
  presenter.open('own-1')

  presenter.clearPrivateData()

  assert.deepEqual(presenter.counts(), { own: 1, saved: 0 })
  assert.deepEqual(presenter.saved(), [])
  assert.equal(presenter.detail(), null)
  assert.deepEqual(presenter.getSnapshot().reports.map(({ id }) => id), ['own-1'])
})

test('agrega un reporte de demostración al inicio de la colección', () => {
  const { presenter } = setup([demo('existing')])

  presenter.add(demo('new'))

  assert.deepEqual(presenter.getSnapshot().reports.map(({ id }) => id), ['new', 'existing'])
})
