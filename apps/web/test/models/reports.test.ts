import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from '@jest/globals'
import { hasActiveFilters, matchesFilters, toReportQuery } from '../../src/models/reports/filters.js'
import type { DemoReport } from '../../src/models/reports/report.js'
import { isOwnedBy } from '../../src/models/reports/report.js'
import { summarizeReports } from '../../src/models/reports/stats.js'

const searchableReport: DemoReport = {
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
  author: { id: 'demo-owner', displayName: 'Demo' },
  phone: '59170000001',
  position: { top: '30%', left: '28%' },
}

test('web declara un workspace TypeScript estricto y sus contratos compartidos', () => {
  const manifestPath = new URL('../../package.json', import.meta.url)
  const tsconfigPath = new URL('../../tsconfig.json', import.meta.url)
  assert.equal(existsSync(manifestPath), true)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'))
  assert.equal(manifest.name, '@perdiu/web')
  assert.equal(manifest.dependencies['@perdiu/contracts'], 'workspace:*')
  assert.equal(manifest.scripts.build, 'tsc -p tsconfig.json')
  assert.equal(tsconfig.compilerOptions.strict, true)
})

test('la búsqueda del catálogo recorta los espacios exteriores', () => {
  assert.deepEqual(toReportQuery({ text: '  CÁMARA  ' }), { q: 'CÁMARA' })
})

test('la consulta omite el texto que queda vacío al recortarlo', () => {
  assert.deepEqual(toReportQuery({ text: '   ' }), {})
})

test('la ciudad seleccionada se incluye en la consulta', () => {
  const filters = { text: '', city: 'La Paz' }
  assert.deepEqual(toReportQuery(filters), { city: 'La Paz' })
})

test('la categoría seleccionada se incluye en la consulta', () => {
  const filters = { text: '', category: 'object' as const }
  assert.deepEqual(toReportQuery(filters), { category: 'object' })
})

test('el tipo seleccionado se incluye en la consulta', () => {
  const filters = { text: '', type: 'lost' as const }
  assert.deepEqual(toReportQuery(filters), { type: 'lost' })
})

test('una búsqueda con texto cuenta como filtro activo', () => {
  assert.equal(hasActiveFilters({ text: 'cámara' }), true)
})

test('los espacios no cuentan como búsqueda activa', () => {
  assert.equal(hasActiveFilters({ text: '   ' }), false)
})

test('una ciudad seleccionada cuenta como filtro activo', () => {
  assert.equal(hasActiveFilters({ text: '', city: 'La Paz' }), true)
})

test('una categoría seleccionada cuenta como filtro activo', () => {
  assert.equal(hasActiveFilters({ text: '', category: 'object' }), true)
})

test('un tipo seleccionado cuenta como filtro activo', () => {
  assert.equal(hasActiveFilters({ text: '', type: 'found' }), true)
})

test('la búsqueda local ignora mayúsculas y tildes', () => {
  assert.equal(matchesFilters(searchableReport, { text: 'SOPOCACHÍ' }), true)
})

test('la búsqueda local excluye reportes resueltos', () => {
  assert.equal(matchesFilters({ ...searchableReport, state: 'resolved' }, { text: '' }), false)
})

test('la ciudad filtra por coincidencia exacta', () => {
  assert.equal(matchesFilters(searchableReport, { text: '', city: 'Cochabamba' }), false)
})

test('la categoría excluye reportes de otra categoría', () => {
  assert.equal(matchesFilters(searchableReport, { text: '', category: 'object' }), false)
})

test('el tipo excluye reportes de otra clase', () => {
  assert.equal(matchesFilters(searchableReport, { text: '', type: 'found' }), false)
})

test('la propiedad demo se determina por ID y no por nombre visible', () => {
  const renamedOwner = {
    ...searchableReport,
    author: { ...searchableReport.author, displayName: 'Nombre cambiado' },
  }
  const sameNameDifferentId = {
    ...searchableReport,
    author: { ...searchableReport.author, id: 'someone-else' },
  }
  assert.equal(isOwnedBy(renamedOwner, 'demo-owner'), true)
  assert.equal(isOwnedBy(sameNameDifferentId, 'demo-owner'), false)
})

test('el resumen cuenta activos, tipos y ciudades conocidas o restantes', () => {
  const reports = [
    searchableReport,
    { ...searchableReport, id: 'demo-2', type: 'found' as const, city: 'Cochabamba' },
    { ...searchableReport, id: 'demo-3', city: 'Tarija' },
    { ...searchableReport, id: 'demo-4', state: 'resolved' as const },
  ]

  assert.deepEqual(summarizeReports(reports), {
    active: 3,
    lost: 2,
    found: 1,
    resolved: 1,
    byCity: [
      { city: 'La Paz', count: 1 },
      { city: 'Cochabamba', count: 1 },
      { city: 'Santa Cruz', count: 0 },
    ],
    other: 1,
  })
})
