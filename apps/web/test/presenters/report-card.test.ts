import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { DemoReport } from '../../src/models/reports/report.js'
import { toReportCard } from '../../src/presenters/reports/report-card.js'

const report: DemoReport = {
  id: 'demo-1',
  source: 'demo',
  type: 'lost',
  state: 'active',
  category: 'pet',
  title: 'Luna, perrita café',
  description: 'Se perdió cerca del parque.',
  city: 'La Paz',
  zone: 'Sopocachi',
  incidentDate: '2026-10-06',
  createdAt: '2026-10-06T14:00:00.000Z',
  imageUrls: [],
  author: { id: 'owner-1', displayName: 'María' },
  phone: '59170000001',
  position: { top: '30%', left: '28%' },
}

test('proyecta un reporte a los datos visibles de una tarjeta', () => {
  assert.deepEqual(toReportCard(report), {
    id: 'demo-1',
    source: 'demo',
    title: 'Luna, perrita café',
    description: 'Se perdió cerca del parque.',
    category: 'Mascota',
    status: 'Perdido',
    badge: 'Perdido',
    tone: 'lost',
    resolved: false,
    city: 'La Paz',
    zone: 'Sopocachi',
    date: '6 oct de 2026',
    posted: '6 oct de 2026',
    image: '/images/pet.svg',
    person: 'María',
  })
})

test('un reporte resuelto muestra el badge de resuelto', () => {
  const card = toReportCard({ ...report, state: 'resolved' })
  assert.equal(card.status, 'Perdido')
  assert.equal(card.badge, 'Resuelto')
  assert.equal(card.resolved, true)
})

test('prefiere la foto del reporte al ícono de categoría', () => {
  assert.equal(toReportCard({ ...report, imageUrls: ['https://example.test/photo.jpg'] }).image,
    'https://example.test/photo.jpg')
})

test('proyecta categorías y estados encontrados con sus etiquetas', () => {
  const card = toReportCard({ ...report, category: 'document', type: 'found' })
  assert.deepEqual(
    { category: card.category, status: card.status, badge: card.badge, image: card.image },
    {
      category: 'Documentos',
      status: 'Encontrado',
      badge: 'Encontrado',
      image: '/images/document.svg',
    },
  )
})

test('formatea la fecha del incidente en UTC y la publicación en el día de Bolivia', () => {
  const card = toReportCard({
    ...report,
    incidentDate: '2026-10-21',
    createdAt: '2026-10-21T02:30:00.000Z',
  })
  assert.equal(card.date, '21 oct de 2026')
  assert.equal(card.posted, '20 oct de 2026')
})
