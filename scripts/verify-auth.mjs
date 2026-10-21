import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPool } from '../packages/database/dist/index.js'
import { migrate } from '../packages/database/dist/maintenance.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const project = `perdiu-auth-test-${randomBytes(4).toString('hex')}`

function run(command, args, { env = {}, capture = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', capture ? 'pipe' : 'inherit', 'pipe'],
    })
    let output = ''
    let errors = ''
    child.stdout?.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (errors += chunk))
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0
        ? resolve(output.trim())
        : reject(new Error(`Falló ${command} (código ${code}).\n${errors.slice(-800)}`)),
    )
  })
}

async function freePort() {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

async function until(check, message, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const value = await check()
      if (value) return value
    } catch {
      // The service can refuse connections while its health check is starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(message)
}

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const signingKeys = [
  {
    ...privateKey.export({ format: 'jwk' }),
    kid: randomUUID(),
    use: 'sig',
    key_ops: ['sign', 'verify'],
    alg: 'ES256',
  },
]
const [postgresPort, authPort, mailPort] = await Promise.all([freePort(), freePort(), freePort()])
const siteUrl = `http://127.0.0.1:${await freePort()}`
const publicUrl = `${siteUrl}/auth`
const postgresPassword = randomBytes(24).toString('hex')
const authPassword = randomBytes(24).toString('hex')
const jwtSecret = randomBytes(32).toString('hex')
const directory = await mkdtemp(join(tmpdir(), 'perdiu-auth-'))
const envFile = join(directory, 'compose.env')
await writeFile(
  envFile,
  [
    `POSTGRES_PASSWORD=${postgresPassword}`,
    `AUTH_DB_PASSWORD=${authPassword}`,
    `AUTH_JWT_SECRET=${jwtSecret}`,
    `AUTH_JWT_KEYS='${JSON.stringify(signingKeys)}'`,
    `AUTH_SITE_URL=${siteUrl}`,
    `AUTH_PUBLIC_URL=${publicUrl}`,
    `AUTH_REDIRECT_ALLOW_LIST=${siteUrl}/**`,
    'AUTH_MAILER_AUTOCONFIRM=false',
    `POSTGRES_PORT=${postgresPort}`,
    `AUTH_PORT=${authPort}`,
    `MAILPIT_PORT=${mailPort}`,
  ].join('\n'),
  { mode: 0o600 },
)
const testEnvironment = {
  POSTGRES_PASSWORD: postgresPassword,
  AUTH_DB_PASSWORD: authPassword,
  AUTH_JWT_SECRET: jwtSecret,
  AUTH_JWT_KEYS: JSON.stringify(signingKeys),
  AUTH_SITE_URL: siteUrl,
  AUTH_PUBLIC_URL: publicUrl,
  AUTH_REDIRECT_ALLOW_LIST: `${siteUrl}/**`,
  AUTH_MAILER_AUTOCONFIRM: 'false',
  POSTGRES_PORT: String(postgresPort),
  AUTH_PORT: String(authPort),
  MAILPIT_PORT: String(mailPort),
}
const compose = (...args) =>
  run('docker', ['compose', '-p', project, '--env-file', envFile, '-f', 'compose.yaml', ...args], {
    env: testEnvironment,
  })

let started = false
let api
let apiErrors = ''
try {
  started = true
  await compose('up', '-d', '--wait')
  await until(async () => (await fetch(`http://127.0.0.1:${authPort}/health`)).ok, 'Auth no inició.')

  await compose('run', '--rm', 'auth-db-init')
  const sql = (database, query) =>
    compose(
      'exec',
      '-T',
      '-e',
      `PGPASSWORD=${postgresPassword}`,
      'postgres',
      'psql',
      '-U',
      'perdiu',
      '-d',
      database,
      '-Atc',
      query,
    )
  assert.equal(await sql('perdiu_dev', "SELECT count(*) FROM pg_namespace WHERE nspname = 'auth'"), '0')
  assert.equal(
    await sql(
      'perdiu_dev',
      "SELECT rolsuper OR rolcreaterole OR rolcreatedb FROM pg_roles WHERE rolname = 'perdiu_auth'",
    ),
    'f',
  )
  console.log('✓ Auth local listo; bootstrap repetible y sin modificar el esquema perdiu_dev')

  const authUrl = `http://127.0.0.1:${authPort}`
  const email = `acceptance-${randomBytes(4).toString('hex')}@example.test`
  const password = `Clave-${randomBytes(6).toString('hex')}`
  const signup = await fetch(`${authUrl}/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(signup.status, 200)
  const registration = await signup.json()
  assert.equal(registration.email, email)
  assert.equal(registration.access_token, undefined, 'un correo sin confirmar no inicia sesión')
  console.log('✓ registro local crea la cuenta sin emitir una sesión antes de confirmar el correo')

  const unconfirmedLogin = await fetch(`${authUrl}/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(unconfirmedLogin.status, 400)
  assert.equal((await unconfirmedLogin.json()).error_code, 'email_not_confirmed')
  console.log('✓ Auth rechaza el inicio de sesión mientras el correo siga sin confirmar')

  const confirmationLink = await until(async () => {
    const messages = await (await fetch(`http://127.0.0.1:${mailPort}/api/v1/messages`)).json()
    const message = messages.messages.find((item) => item.To[0].Address === email)
    if (!message) return undefined
    const details = await (
      await fetch(`http://127.0.0.1:${mailPort}/api/v1/message/${message.ID}`)
    ).json()
    return details.Text.match(/https?:\/\/[^\s)]+/)?.[0]
  }, 'Mailpit no recibió el correo de confirmación.')
  assert.ok(confirmationLink.startsWith(`${publicUrl}/verify?`))
  const confirmed = await fetch(confirmationLink.replace(publicUrl, authUrl), { redirect: 'manual' })
  assert.equal(confirmed.status, 303)
  assert.equal(new URL(confirmed.headers.get('location')).origin, siteUrl)
  console.log('✓ el enlace capturado por Mailpit confirma el correo y redirige al sitio permitido')

  const wrongCredentials = await fetch(`${authUrl}/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: `${password}-incorrecta` }),
  })
  assert.equal(wrongCredentials.status, 400)
  assert.equal((await wrongCredentials.json()).error_code, 'invalid_credentials')
  console.log('✓ Auth rechaza una contraseña incorrecta con el error esperado')

  const validLogin = await fetch(`${authUrl}/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(validLogin.status, 200)
  const session = await validLogin.json()
  assert.ok(session.access_token)
  assert.ok(session.refresh_token)
  assert.equal(JSON.parse(Buffer.from(session.access_token.split('.')[0], 'base64url')).alg, 'ES256')
  console.log('✓ credenciales válidas emiten access token ES256 y refresh token')

  const apiPort = await freePort()
  const databaseUrl = `postgresql://perdiu:${postgresPassword}@127.0.0.1:${postgresPort}/perdiu_test`
  await sql('perdiu_dev', 'CREATE DATABASE perdiu_test')
  const pool = createPool(databaseUrl)
  try {
    await migrate(pool)
  } finally {
    await pool.end()
  }
  api = spawn(process.execPath, ['apps/api/dist/main.js'], {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PORT: String(apiPort),
      HOST: '127.0.0.1',
      AUTH_JWKS_URL: `http://127.0.0.1:${authPort}/.well-known/jwks.json`,
      AUTH_JWT_ISSUER: publicUrl,
      AUTH_JWT_AUDIENCE: 'authenticated',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  api.stderr.on('data', (chunk) => (apiErrors += chunk))
  const apiUrl = `http://127.0.0.1:${apiPort}`
  await until(async () => {
    if (api.exitCode !== null) throw new Error(apiErrors)
    return (await fetch(`${apiUrl}/reports`)).ok
  }, `La API no inició. ${apiErrors}`)

  const me = await fetch(`${apiUrl}/me`, {
    headers: { authorization: `Bearer ${session.access_token}` },
  })
  assert.equal(me.status, 200)
  assert.deepEqual(await me.json(), { id: session.user.id, email })
  assert.equal(me.headers.get('cache-control'), 'no-store')
  console.log('✓ la API acepta el JWT ES256 real y expone solo la identidad verificada')

  const anonymous = await fetch(`${apiUrl}/me`)
  assert.equal(anonymous.status, 401)
  const [header, payload, signature] = session.access_token.split('.')
  const alteredToken = `${header}.${payload}.${signature.slice(0, -4)}AAAA`
  const altered = await fetch(`${apiUrl}/me`, {
    headers: { authorization: `Bearer ${alteredToken}` },
  })
  assert.equal(altered.status, 401)
  assert.equal(altered.headers.get('www-authenticate'), 'Bearer')
  console.log('✓ la API rechaza tokens ausentes o adulterados con respuesta 401 uniforme')

  const refreshed = await fetch(`${authUrl}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  })
  assert.equal(refreshed.status, 200)
  const renewedSession = await refreshed.json()
  assert.ok(renewedSession.access_token)
  assert.notEqual(renewedSession.refresh_token, session.refresh_token)
  const claims = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url'))
  assert.equal(claims(renewedSession.access_token).session_id, claims(session.access_token).session_id)
  console.log('✓ refresh rota el token y conserva el identificador de sesión')

  const renewedIdentity = await fetch(`${apiUrl}/me`, {
    headers: { authorization: `Bearer ${renewedSession.access_token}` },
  })
  assert.equal(renewedIdentity.status, 200)
  const logout = await fetch(`${apiUrl}/me/logout`, {
    method: 'POST',
    headers: { authorization: `Bearer ${renewedSession.access_token}` },
  })
  assert.equal(logout.status, 204)
  assert.equal(logout.headers.get('cache-control'), 'no-store')
  const revoked = await fetch(`${apiUrl}/me`, {
    headers: { authorization: `Bearer ${renewedSession.access_token}` },
  })
  assert.equal(revoked.status, 401)
  console.log('✓ POST /me/logout revoca inmediatamente el access token vigente')

  api.kill()
  await new Promise((resolve) => api.once('exit', resolve))
  api = undefined
  apiErrors = ''
  api = spawn(process.execPath, ['apps/api/dist/main.js'], {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PORT: String(apiPort),
      HOST: '127.0.0.1',
      AUTH_JWKS_URL: `http://127.0.0.1:${authPort}/.well-known/jwks.json`,
      AUTH_JWT_ISSUER: publicUrl,
      AUTH_JWT_AUDIENCE: 'authenticated',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  api.stderr.on('data', (chunk) => (apiErrors += chunk))
  await until(async () => {
    if (api.exitCode !== null) throw new Error(apiErrors)
    return (await fetch(`${apiUrl}/reports`)).ok
  }, `La API no inició después del reinicio. ${apiErrors}`)
  const afterRestart = await fetch(`${apiUrl}/me`, {
    headers: { authorization: `Bearer ${renewedSession.access_token}` },
  })
  assert.equal(afterRestart.status, 401)
  console.log('✓ la revocación de sesión persiste después de reiniciar la API')

  const providerLogout = await fetch(`${authUrl}/logout?scope=local`, {
    method: 'POST',
    headers: { authorization: `Bearer ${renewedSession.access_token}` },
  })
  assert.equal(providerLogout.status, 204)
  const reusedRefresh = await fetch(`${authUrl}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: renewedSession.refresh_token }),
  })
  assert.equal(reusedRefresh.status, 400)
  console.log('✓ el cierre local en Auth invalida el refresh token rotado')
} catch (error) {
  console.error(error.message)
  const logs = await compose('logs', '--no-color', 'auth-db-init').catch(() => '')
  if (logs) console.error(logs)
  process.exitCode = 1
} finally {
  if (api && api.exitCode === null) {
    api.kill()
    await new Promise((resolve) => api.once('exit', resolve))
  }
  if (started) await compose('down', '-v', '--remove-orphans').catch(() => undefined)
  await rm(directory, { recursive: true, force: true })
}
