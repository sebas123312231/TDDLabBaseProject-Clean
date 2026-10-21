import assert from 'node:assert/strict'
import { expect, test } from '@jest/globals'
import { createReportsClient } from '../../src/infrastructure/http/catalog-client.js'

const report = {
  id: 'report-1',
  type: 'found',
  state: 'active',
  category: 'object',
  title: 'Mochila azul',
  description: 'Una mochila azul encontrada.',
  city: 'La Paz',
  zone: 'Centro',
  incidentDate: '2026-10-10',
  createdAt: '2026-10-11T12:00:00.000Z',
  author: { id: 'owner-1', displayName: 'Persona' },
  imageUrls: [],
}

test('sends public filters and keeps only the safe catalog projection', async () => {
  const requests: { url: string; init: RequestInit }[] = []
  const client = createReportsClient('/api/', async (url, init) => {
    requests.push({ url: String(url), init: init ?? {} })
    return new Response(JSON.stringify([{ ...report, ownerId: 'private', phone: 'private' }]))
  })

  expect(await client.list(new AbortController().signal, { q: 'mochila azul', city: 'La Paz' })).toStrictEqual([report])
  const request = requests[0]!
  assert.equal(request.url, '/api/reports?q=mochila+azul&city=La+Paz')
  assert.equal(request.init.credentials, 'omit')
  assert.equal(new Headers(request.init.headers).get('accept'), 'application/json')
})
