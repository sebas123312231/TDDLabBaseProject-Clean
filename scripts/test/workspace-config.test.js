const { existsSync, readFileSync } = require('node:fs')
const { test } = require('@jest/globals')

test('el proyecto usa PNPM y declara workspaces sin reinicializar Git', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'))

  expect(manifest.packageManager).toBe('pnpm@10.29.2')
  expect(existsSync('pnpm-workspace.yaml')).toBe(true)
  expect(existsSync('package-lock.json')).toBe(false)
  expect(manifest.scripts.postinstall).toBeUndefined()
})
