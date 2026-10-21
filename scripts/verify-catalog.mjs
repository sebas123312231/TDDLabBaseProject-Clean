import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:net'
import { parseArgs } from 'node:util'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const { values } = parseArgs({
  options: { 'with-browser': { type: 'boolean', default: false } },
})
const root = fileURLToPath(new URL('../', import.meta.url))
const webRoot = join(root, 'apps/web')
const container = `perdiu-catalog-test-${randomBytes(6).toString('hex')}`
const password = randomBytes(24).toString('hex')

function run(command, args, { env = {}, capture = false, cwd = root } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })
    let output = ''
    let errors = ''
    child.stdout?.on('data', (chunk) => (output += chunk))
    child.stderr?.on('data', (chunk) => (errors += chunk))
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code === 0) resolve(output.trim())
      else reject(new Error(`Falló ${command} (${signal ?? `código ${code}`}): ${errors.slice(-1000)}`))
    })
  })
}

function start(command, args, cwd, env) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  })
  child.startFailed = false
  child.once('error', () => (child.startFailed = true))
  return child
}

async function stop(child) {
  if (!child || child.startFailed || !child.pid || child.exitCode !== null || child.signalCode !== null)
    return
  const exited = new Promise((resolve) => child.once('close', resolve))
  if (process.platform === 'win32') child.kill('SIGTERM')
  else {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch (error) {
      if (error.code !== 'ESRCH') throw error
    }
  }
  let timer
  const terminated = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => (timer = setTimeout(() => resolve(false), 3000))),
  ])
  clearTimeout(timer)
  if (!terminated) {
    if (process.platform === 'win32') child.kill('SIGKILL')
    else process.kill(-child.pid, 'SIGKILL')
    await exited
  }
}

async function freePort() {
  const server = createServer()
  await new Promise((resolve, reject) =>
    server.listen(0, '127.0.0.1', (error) => (error ? reject(error) : resolve())),
  )
  const { port } = server.address()
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
  return port
}

async function waitFor(url, child) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.startFailed || child.exitCode !== null || child.signalCode !== null)
      throw new Error('No se pudo iniciar un servidor de pruebas.')
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) })
      if (response.ok) return
    } catch {
      // Retry while the local process starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`El servidor de pruebas no estuvo disponible: ${url}`)
}

let databaseStarted = false
let api
let web
try {
  await run('pnpm', ['test:build'])
  await run(
    'docker',
    [
      'run', '-d', '--rm', '--name', container,
      '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_USER=perdiu',
      '-e', 'POSTGRES_DB=perdiu_test', '-p', '127.0.0.1::5432', 'postgres:17-alpine',
    ],
    { env: { POSTGRES_PASSWORD: password }, capture: true },
  )
  databaseStarted = true

  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await run('docker', ['exec', container, 'pg_isready', '-U', 'perdiu', '-d', 'perdiu_test'], {
        capture: true,
      })
      ready = true
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  if (!ready) throw new Error('PostgreSQL de pruebas no inició en 30 segundos.')

  const mapping = await run('docker', ['port', container, '5432/tcp'], { capture: true })
  const databasePort = mapping.match(/^127\.0\.0\.1:(\d+)$/)?.[1]
  if (!databasePort) throw new Error('No se pudo determinar el puerto de PostgreSQL de pruebas.')
  const databaseUrl = `postgresql://perdiu:${password}@127.0.0.1:${databasePort}/perdiu_test`
  const testEnv = { TEST_DATABASE_URL: databaseUrl, PERDIU_TEST_CONTAINER: '1', NODE_ENV: 'test' }

  await run('pnpm', [
    '--workspace-root', 'exec', 'jest', '--config', 'jest.integration.config.cjs', '--runInBand',
    '--runTestsByPath', 'apps/api/test/catalog.integration.ts', 'apps/api/test/auth.integration.ts',
  ], { env: testEnv })

  if (values['with-browser']) {
    const databaseEnv = { DATABASE_URL: databaseUrl, PERDIU_TEST_CONTAINER: '1' }
    await run('pnpm', ['--filter', '@perdiu/database', 'db:seed'], { env: databaseEnv })

    const apiPort = await freePort()
    const webPort = await freePort()
    const apiUrl = `http://127.0.0.1:${apiPort}`
    const webUrl = `http://127.0.0.1:${webPort}`
    api = start(process.execPath, [join(root, 'apps/api/dist/main.js')], root, {
      DATABASE_URL: databaseUrl,
      PORT: String(apiPort),
      HOST: '127.0.0.1',
      AUTH_JWKS_URL: 'http://127.0.0.1:9/.well-known/jwks.json',
      AUTH_JWT_ISSUER: 'http://127.0.0.1/auth',
      AUTH_JWT_AUDIENCE: 'authenticated',
    })
    await waitFor(`${apiUrl}/reports`, api)

    web = start(process.execPath, [
      join(webRoot, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1',
      '--port', String(webPort), '--strictPort',
    ], webRoot, {
      API_PROXY_TARGET: apiUrl,
      AUTH_PROXY_TARGET: 'http://127.0.0.1:9',
      VITE_API_BASE_URL: '/api',
      VITE_AUTH_URL: '/auth',
    })
    await waitFor(webUrl, web)
    await run('pnpm', [
      'exec', 'cypress', 'run', '--config', `baseUrl=${webUrl}`,
      '--spec', 'cypress/e2e/catalog-live.cy.js',
    ])
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  try {
    await stop(web)
    await stop(api)
  } catch (error) {
    console.error(`No se pudo cerrar un servidor de pruebas: ${error.message}`)
    process.exitCode = 1
  }
  if (databaseStarted) {
    try {
      await run('docker', ['stop', container], { capture: true })
    } catch (error) {
      console.error(`No se pudo eliminar el PostgreSQL temporal: ${error.message}`)
      process.exitCode = 1
    }
  }
}
