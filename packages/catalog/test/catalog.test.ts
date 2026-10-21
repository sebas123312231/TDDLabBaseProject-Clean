import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { ListReports, type ReportRecord } from '../src/index.js'

const record = (id: string, createdAt: string): ReportRecord => ({
  id,
  ownerId: 'owner-1',
  title: 'Mochila azul',
  description: 'Encontrada en el centro.',
  type: 'found',
  state: 'active',
  category: 'object',
  city: 'La Paz',
  zone: 'Centro',
  incidentDate: '2026-10-20',
  createdAt,
  author: { id: 'owner-1', displayName: 'Persona de prueba' },
  imageUrls: [],
})

test('el catálogo ordena primero los reportes creados más recientemente', async () => {
  const reports = [
    record('older', '2026-10-19T12:00:00.000Z'),
    record('newer', '2026-10-20T12:00:00.000Z'),
  ]
  const result = await new ListReports({ list: async () => reports }).execute()

  assert.deepEqual(
    result.map(({ id }) => id),
    ['newer', 'older'],
  )
})

test('desempata reportes de igual fecha por ID ascendente', async () => {
  const reports = [
    record('b', '2026-10-20T12:00:00.000Z'),
    record('a', '2026-10-20T12:00:00.000Z'),
  ]
  const result = await new ListReports({ list: async () => reports }).execute()

  assert.deepEqual(
    result.map(({ id }) => id),
    ['a', 'b'],
  )
})

test('el catálogo público excluye reportes resueltos', async () => {
  const reports = [
    record('active', '2026-10-20T12:00:00.000Z'),
    record('resolved', '2026-10-21T12:00:00.000Z'),
  ].map((report) =>
    report.id === 'resolved' ? { ...report, state: 'resolved' as const } : report,
  )
  const result = await new ListReports({ list: async () => reports }).execute()

  assert.deepEqual(
    result.map(({ id }) => id),
    ['active'],
  )
})

test('el caso de uso transmite los filtros solicitados al puerto del catálogo', async () => {
  const query = { q: 'camara', type: 'lost', category: 'object', city: 'La Paz' } as const
  let received: unknown
  const result = await new ListReports({
    list: async (filters) => {
      received = filters
      return []
    },
  }).execute(query)

  assert.deepEqual(received, query)
  assert.deepEqual(result, [])
})

test('el catálogo ordenado limita a 50 resultados activos después de excluir resueltos', async () => {
  const reports = Array.from({ length: 60 }, (_, index) =>
    record(String(index).padStart(2, '0'), '2026-10-20T12:00:00.000Z'),
  ).reverse()
  reports.unshift({ ...record('resolved', '2026-10-21T12:00:00.000Z'), state: 'resolved' })
  const result = await new ListReports({ list: async () => reports }).execute()

  assert.equal(result.length, 50)
  assert.equal(result[0]?.id, '00')
  assert.equal(result[49]?.id, '49')
})

test('la respuesta pública excluye datos privados y conserva solo el perfil permitido', async () => {
  const privateRecord = {
    ...record('public', '2026-10-20T12:00:00.000Z'),
    phone: 'private-phone-sentinel',
    email: 'private-email-sentinel',
    storageKey: 'private-storage-sentinel',
    token: 'private-token-sentinel',
    author: {
      id: 'owner-1',
      displayName: 'Persona de prueba',
      email: 'private-author-sentinel',
    },
  }
  const result = await new ListReports({ list: async () => [privateRecord] }).execute()

  assert.deepEqual(result, [
    {
      id: 'public',
      title: 'Mochila azul',
      description: 'Encontrada en el centro.',
      type: 'found',
      state: 'active',
      category: 'object',
      city: 'La Paz',
      zone: 'Centro',
      incidentDate: '2026-10-20',
      createdAt: '2026-10-20T12:00:00.000Z',
      author: { id: 'owner-1', displayName: 'Persona de prueba' },
      imageUrls: [],
    },
  ])
  assert.ok(!/private-(phone|email|storage|token|author)/.test(JSON.stringify(result)))
})

test('conserva el orden de PostgreSQL para fechas dentro del mismo milisegundo', async () => {
  const reports = [
    record('a', '2026-10-20T12:00:00.123100Z'),
    record('b', '2026-10-20T12:00:00.123900Z'),
  ]
  const result = await new ListReports({ list: async () => reports }).execute()

  assert.deepEqual(
    result.map(({ id }) => id),
    ['b', 'a'],
  )
})
