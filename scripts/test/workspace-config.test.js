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

test('el workspace descubre las aplicaciones del proyecto', () => {
  const workspace = readFileSync('pnpm-workspace.yaml', 'utf8')

  assert.match(workspace, /^\s*- apps\/\*\s*$/m)
})

test('las pruebas instrumentadas construyen los workspaces antes de ejecutar Jest', () => {
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'))

  assert.equal(scripts.test, 'pnpm test:build && node ./scripts/run-tdd.mjs')
  assert.equal(scripts['test:build'], 'pnpm --recursive --if-present build')
})

test('los comandos principales ejecutan Vite y las aplicaciones del workspace', () => {
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'))

  assert.equal(scripts.preview, 'pnpm --filter @perdiu/web preview')
  assert.equal(scripts.build, 'pnpm --recursive --if-present build')
  assert.equal(
    scripts.dev,
    'pnpm test:build && pnpm --parallel --stream --filter @perdiu/api --filter @perdiu/web run dev',
  )
  assert.equal(scripts['dev:api'], 'pnpm test:build && pnpm --filter @perdiu/api dev')
  assert.equal(scripts['dev:web'], 'pnpm --filter @perdiu/web dev')
})

test('los comandos locales administran PostgreSQL y sus migraciones', () => {
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'))

  assert.equal(scripts['db:up'], 'docker compose up -d --wait')
  assert.equal(scripts['db:down'], 'docker compose down')
  assert.equal(
    scripts['db:migrate'],
    'pnpm --filter @perdiu/database... build && pnpm --filter @perdiu/database db:migrate',
  )
  assert.equal(
    scripts['db:seed'],
    'pnpm --filter @perdiu/database... build && pnpm --filter @perdiu/database db:seed',
  )
})
