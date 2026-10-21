import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from '@jest/globals'

test('expone integración de API y aceptación de navegador del catálogo', () => {
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'))

  assert.equal(scripts['test:integration'], 'node scripts/verify-catalog.mjs')
  assert.equal(scripts['test:e2e'], 'node scripts/verify-catalog.mjs --with-browser')
})
