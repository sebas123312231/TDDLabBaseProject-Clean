import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from '@jest/globals'

interface WorkspaceManifest {
  packageManager: string
}

const manifest: WorkspaceManifest = JSON.parse(readFileSync('package.json', 'utf8'))

test('Jest ejecuta pruebas TypeScript del workspace', () => {
  assert.equal(manifest.packageManager, 'pnpm@10.29.2')
})
