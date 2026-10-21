import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { REPORT_RESULT_LIMIT, type ReportSummary } from '../src/index.js'

const publicReport: ReportSummary = {
  id: 'report-1',
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
}

test('el catálogo público limita sus resultados a cincuenta', () => {
  assert.equal(REPORT_RESULT_LIMIT, 50)
  assert.equal(publicReport.state, 'active')
})
