import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from '@jest/globals'

test('the web package uses Vite to build a React application', () => {
  const { scripts, dependencies, devDependencies } = JSON.parse(
    readFileSync('apps/web/package.json', 'utf8'),
  )

  assert.match(scripts.dev, /vite/)
  assert.match(scripts.build, /vite build/)
  assert.match(dependencies.react, /^\^19\./)
  assert.match(dependencies['react-dom'], /^\^19\./)
  assert.match(devDependencies.vite, /^\^8\./)
  assert.equal(devDependencies['@vitejs/plugin-react'], '^6.1.2')
})
