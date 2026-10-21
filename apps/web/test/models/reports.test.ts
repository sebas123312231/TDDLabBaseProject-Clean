import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from '@jest/globals'
import { toReportQuery } from '../../src/models/reports/filters.js'

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
