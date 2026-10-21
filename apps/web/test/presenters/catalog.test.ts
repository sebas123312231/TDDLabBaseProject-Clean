import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { ReportSummary } from '@perdiu/contracts'
import { CatalogPresenter } from '../../src/presenters/catalog/catalog.presenter.js'

const report: ReportSummary = {
  id: 'report-1',
  type: 'found',
  state: 'active',
  category: 'object',
  title: 'Mochila azul',
  description: 'Reporte de prueba.',
  city: 'La Paz',
  zone: 'Centro',
  incidentDate: '2026-10-10',
  createdAt: '2026-10-11T12:00:00.000Z',
  author: { id: 'owner-1', displayName: 'Santiago' },
  imageUrls: [],
}

test('inicia con el catálogo en estado de carga y sin reportes', () => {
  const presenter = new CatalogPresenter({ list: async () => [] })
  assert.deepEqual(presenter.getSnapshot(), { status: 'loading', reports: [] })
})

test('carga y proyecta reportes públicos al estado listo', async () => {
  const presenter = new CatalogPresenter({ list: async () => [report] })

  await presenter.load()

  const state = presenter.getSnapshot()
  assert.equal(state.status, 'ready')
  if (state.status !== 'ready') return
  assert.deepEqual(
    state.reports.map(({ id, source, title, category, status, person }) => ({
      id,
      source,
      title,
      category,
      status,
      person,
    })),
    [
      {
        id: 'report-1',
        source: 'catalog',
        title: 'Mochila azul',
        category: 'Objeto',
        status: 'Encontrado',
        person: 'Santiago',
      },
    ],
  )
  assert.ok(!JSON.stringify(state).includes('owner-1'))
})

test('presenta un mensaje público cuando falla la consulta', async () => {
  const presenter = new CatalogPresenter({
    list: async () => {
      throw new Error('private-network-detail')
    },
  })

  await presenter.load()

  assert.deepEqual(presenter.getSnapshot(), {
    status: 'error',
    reports: [],
    message: 'No se pudo cargar el catálogo. Intenta nuevamente.',
  })
})

test('traduce las selecciones visibles a la consulta del catálogo', async () => {
  const queries: unknown[] = []
  const presenter = new CatalogPresenter({
    list: async (_signal, query) => {
      queries.push(query)
      return []
    },
  })

  await presenter.load({
    search: '  CÁMARA  ',
    city: 'La Paz',
    category: 'Objeto',
    status: 'Perdido',
  })

  assert.deepEqual(queries, [{ q: 'CÁMARA', city: 'La Paz', category: 'object', type: 'lost' }])
})

test('reintenta la última consulta cuando load se invoca sin nuevas selecciones', async () => {
  const queries: unknown[] = []
  let fail = true
  const presenter = new CatalogPresenter({
    list: async (_signal, query) => {
      queries.push(query)
      if (fail) throw new Error('network-detail')
      return [report]
    },
  })
  const selection = {
    search: 'mochila',
    city: 'La Paz',
    category: 'Objeto',
    status: 'Encontrado' as const,
  }

  await presenter.load(selection)
  fail = false
  await presenter.load()

  assert.deepEqual(queries, [
    { q: 'mochila', city: 'La Paz', category: 'object', type: 'found' },
    { q: 'mochila', city: 'La Paz', category: 'object', type: 'found' },
  ])
  assert.equal(presenter.getSnapshot().status, 'ready')
})

test('cancela solicitudes anteriores y descarta sus respuestas y errores obsoletos', async () => {
  for (const staleFails of [false, true]) {
    let resolveOld!: (reports: ReportSummary[]) => void
    let rejectOld!: (error: Error) => void
    const oldResponse = new Promise<ReportSummary[]>((resolve, reject) => {
      resolveOld = resolve
      rejectOld = reject
    })
    const signals: AbortSignal[] = []
    const presenter = new CatalogPresenter({
      list: async (signal, query) => {
        signals.push(signal)
        return query?.q === 'anterior' ? oldResponse : [report]
      },
    })
    const previous = presenter.load({
      search: 'anterior',
      city: 'Todas las ciudades',
      category: 'Todas las categorías',
      status: 'Todos',
    })

    await presenter.load({
      search: 'actual',
      city: 'Todas las ciudades',
      category: 'Todas las categorías',
      status: 'Todos',
    })

    assert.equal(signals[0]?.aborted, true)
    assert.equal(signals[1]?.aborted, false)
    if (staleFails) rejectOld(new Error('stale-error'))
    else resolveOld([])
    await previous
    assert.equal(presenter.getSnapshot().status, 'ready')
    assert.deepEqual(presenter.getSnapshot().reports.map(({ id }) => id), ['report-1'])
  }
})

test('cancelar una carga descarta su respuesta pendiente', async () => {
  let resolve!: (reports: ReportSummary[]) => void
  const response = new Promise<ReportSummary[]>((done) => {
    resolve = done
  })
  const presenter = new CatalogPresenter({ list: async () => response })
  const pending = presenter.load()

  presenter.cancel()
  resolve([report])
  await pending

  assert.deepEqual(presenter.getSnapshot(), { status: 'loading', reports: [] })
})

test('encuentra la entidad cargada detrás de una tarjeta visible', async () => {
  const presenter = new CatalogPresenter({ list: async () => [report] })
  await presenter.load()

  assert.deepEqual(presenter.find('report-1'), { ...report, source: 'catalog' })
  assert.equal(presenter.find('missing'), undefined)
})

test('el resumen de lista vacía distingue la búsqueda activa del catálogo general', async () => {
  const presenter = new CatalogPresenter({ list: async () => [] })
  await presenter.load()
  assert.deepEqual(presenter.summary(), {
    count: 0,
    limitReached: false,
    limit: 50,
    empty: {
      title: 'Todavía no hay reportes',
      description: 'Cuando la comunidad publique reportes, aparecerán aquí.',
    },
  })

  await presenter.load({
    search: 'Luna',
    city: 'Todas las ciudades',
    category: 'Todas las categorías',
    status: 'Todos',
  })
  assert.deepEqual(presenter.summary().empty, {
    title: 'No se encontraron coincidencias',
    description: 'Prueba con otra búsqueda o publica un reporte.',
  })
})

test('indica cuándo el catálogo llegó al límite de resultados', async () => {
  for (const count of [49, 50]) {
    const reports = Array.from({ length: count }, (_, index) => ({ ...report, id: `report-${index}` }))
    const presenter = new CatalogPresenter({ list: async () => reports })
    await presenter.load()
    assert.equal(presenter.summary().count, count)
    assert.equal(presenter.summary().limit, 50)
    assert.equal(presenter.summary().limitReached, count === 50)
  }
})
