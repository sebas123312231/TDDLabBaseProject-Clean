import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from '@jest/globals'

test('el proyecto usa PNPM y declara workspaces sin reinicializar Git', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'))

  assert.equal(manifest.packageManager, 'pnpm@10.29.2')
  assert.equal(existsSync('pnpm-workspace.yaml'), true)
  assert.equal(existsSync('package-lock.json'), false)
  assert.equal(manifest.scripts.postinstall, undefined)
})

test('las pruebas instrumentadas construyen los workspaces antes de ejecutar Jest', () => {
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'))

  assert.equal(scripts.test, 'pnpm test:build && node ./scripts/run-tdd.mjs')
  assert.equal(scripts['test:build'], 'pnpm --recursive --if-present build')
})
