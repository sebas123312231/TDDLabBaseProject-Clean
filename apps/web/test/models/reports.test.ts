import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from '@jest/globals'
import { hasActiveFilters, toReportQuery } from '../../src/models/reports/filters.js'

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
