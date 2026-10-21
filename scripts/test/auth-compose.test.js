import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { test } from '@jest/globals'

test('Compose configura Auth local, base separada y puertos solo en loopback', () => {
  const result = spawnSync(
    'docker',
    ['compose', '-p', 'perdiu-auth-config-test', '--env-file', '/dev/null', '-f', 'compose.yaml', 'config', '--format', 'json'],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        POSTGRES_PASSWORD: 'local-postgres-test-secret',
        AUTH_DB_PASSWORD: 'local-auth-test-secret',
        AUTH_JWT_SECRET: 'local-jwt-test-secret',
        AUTH_JWT_KEYS: '[]',
        POSTGRES_PORT: '15433',
        AUTH_PORT: '19999',
        MAILPIT_PORT: '18025',
      },
    },
  )

  assert.equal(result.status, 0, result.stderr)
  const compose = JSON.parse(result.stdout)
  assert.deepEqual(Object.keys(compose.services).sort(), ['auth', 'auth-db-init', 'mail', 'postgres'])
  assert.equal(compose.services.auth.image, 'supabase/gotrue:v2.197.0')
  assert.equal(compose.services.auth.environment.GOTRUE_MAILER_AUTOCONFIRM, 'false')
  assert.match(compose.services.auth.environment.GOTRUE_DB_DATABASE_URL, /\/perdiu_auth\?/)
  assert.equal(compose.services.auth.environment.GOTRUE_JWT_AUD, 'authenticated')
  assert.equal(compose.services['auth-db-init'].volumes[0].read_only, true)
  assert.match(compose.services['auth-db-init'].command.join(' '), /pg_isready/)
  assert.equal(compose.services.postgres.ports[0].published, '15433')
  assert.equal(compose.services.auth.ports[0].published, '19999')
  assert.equal(compose.services.mail.ports[0].published, '18025')

  for (const service of ['postgres', 'auth', 'mail']) {
    assert.ok(compose.services[service].ports.length > 0)
    assert.ok(compose.services[service].ports.every((port) => port.host_ip === '127.0.0.1'))
  }
})

test('Git ignora los archivos de secretos locales y conserva las plantillas .env.example', () => {
  const isIgnored = (path) =>
    spawnSync('git', ['check-ignore', '--no-index', '-q', path]).status === 0

  assert.equal(isIgnored('.env'), true)
  assert.equal(isIgnored('apps/web/.env.local'), true)
  assert.equal(isIgnored('.env.example'), false)
  assert.equal(isIgnored('apps/web/.env.example'), false)
})

test('las variables secretas solo aparecen en la plantilla raíz y la web recibe URLs públicas', () => {
  const rootEnvironment = readFileSync('.env.example', 'utf8')
  const webEnvironment = readFileSync('apps/web/.env.example', 'utf8')

  for (const variable of ['AUTH_DB_PASSWORD', 'AUTH_JWT_SECRET', 'AUTH_JWT_KEYS']) {
    assert.match(rootEnvironment, new RegExp(`^${variable}=`, 'm'))
  }
  assert.match(webEnvironment, /^VITE_API_BASE_URL=/m)
  assert.match(webEnvironment, /^VITE_AUTH_URL=/m)
  assert.doesNotMatch(webEnvironment, /POSTGRES_PASSWORD|AUTH_DB_PASSWORD|AUTH_JWT_SECRET|AUTH_JWT_KEYS/)
})

test('test:auth construye los workspaces y ejecuta el verificador de Auth', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))

  assert.equal(packageJson.scripts['test:auth'], 'pnpm test:build && node scripts/verify-auth.mjs')
})
