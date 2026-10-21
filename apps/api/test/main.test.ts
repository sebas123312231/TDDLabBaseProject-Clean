import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath, URL } from 'node:url'
import { test } from '@jest/globals'
import { assertLocalDatabase } from '@perdiu/database/config'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const main = fileURLToPath(new URL('../dist/main.js', import.meta.url))
const databaseTest = process.env.PERDIU_TEST_CONTAINER === '1' ? test : test.skip

async function availablePort(): Promise<number> {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
  return address.port
}

test('la API ofrece arranque compilado y desarrollo con tsx', () => {
  assert.equal(packageJson.scripts.start, 'node dist/main.js')
  assert.equal(
    packageJson.scripts.dev,
    "tsx watch --include '../../packages/catalog/dist/**/*.js' --include '../../packages/database/dist/**/*.js' --include '../../packages/contracts/dist/**/*.js' src/main.ts",
  )
  assert.equal(packageJson.devDependencies.tsx, '^4.23.15')
})

databaseTest('el proceso compilado escucha con la configuración local', async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)
  const port = await availablePort()
  const child = spawn(process.execPath, [main], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      AUTH_JWKS_URL: 'https://auth.example.test/.well-known/jwks.json',
      AUTH_JWT_ISSUER: 'https://auth.example.test',
      AUTH_JWT_AUDIENCE: 'authenticated',
      PORT: String(port),
      HOST: '127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  const ready = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(output)), 5000)
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString()
      if (output.includes('API de PerdiU lista.')) {
        clearTimeout(timeout)
        resolve()
      }
    })
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.once('exit', (code, signal) => {
      clearTimeout(timeout)
      reject(new Error(`API terminó antes de escuchar (${code ?? signal}): ${output}`))
    })
  })

  try {
    await ready
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM')
      await once(child, 'exit')
    }
  }
})
