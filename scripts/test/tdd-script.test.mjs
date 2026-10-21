import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repository = fileURLToPath(new URL('../../', import.meta.url))

test('npm test usa el wrapper fail-closed y el harness del runner es invocable', () => {
  const { scripts } = JSON.parse(readFileSync(join(repository, 'package.json'), 'utf8'))

  assert.equal(scripts.test, 'node ./scripts/run-tdd.mjs')
  assert.equal(scripts['test:runner'], 'node --test scripts/test/tdd-script.test.mjs')
})

function createFixture(context, name) {
  const root = mkdtempSync(join(tmpdir(), `tdd-wrapper-${name}-`))
  context.after(() => rmSync(root, { recursive: true, force: true }))

  for (const directory of ['script', 'scripts', '__tests__']) mkdirSync(join(root, directory))
  symlinkSync(join(repository, 'node_modules'), join(root, 'node_modules'), 'dir')
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module' }))
  cpSync(join(repository, 'script/tddScript.js'), join(root, 'script/tddScript.js'))
  cpSync(join(repository, 'script/id_execution_tests_commit.js'), join(root, 'script/id_execution_tests_commit.js'))
  cpSync(join(repository, 'scripts/run-tdd.mjs'), join(root, 'scripts/run-tdd.mjs'))
  return root
}

function runRunner(root, extraPath = []) {
  return spawnSync(process.execPath, ['scripts/run-tdd.mjs'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: [...extraPath, join(repository, 'node_modules/.bin'), process.env.PATH].join(delimiter),
    },
  })
}

function readLog(root) {
  return JSON.parse(readFileSync(join(root, 'script/tdd_log.json'), 'utf8'))
}

test('propaga el fallo de Jest al comando de TDD', (context) => {
  const root = createFixture(context, 'failure')
  writeFileSync(
    join(root, '__tests__/failure.test.js'),
    "test('falla por una expectativa incorrecta', () => { expect(1).toBe(2) })\n",
  )

  const result = runRunner(root)
  const log = readLog(root)

  assert.equal(log[0]?.failedTests, 1, result.stdout + result.stderr)
  assert.equal(result.status, 1, result.stdout + result.stderr)
})

test('rechaza una ejecución aprobada de Jest que no ejecuta pruebas', (context) => {
  const root = createFixture(context, 'empty')
  const bin = join(root, 'bin')
  mkdirSync(bin)
  const jest = join(bin, 'jest')
  writeFileSync(
    jest,
    `#!/bin/sh\nexec '${join(repository, 'node_modules/.bin/jest')}' --passWithNoTests "$@"\n`,
  )
  chmodSync(jest, 0o755)

  const result = runRunner(root, [bin])
  const log = readLog(root)

  assert.equal(log[0]?.numTotalTests, 0, result.stdout + result.stderr)
  assert.equal(result.status, 1, result.stdout + result.stderr)
})

test('no acepta un reporte verde anterior si Jest no crea uno nuevo', (context) => {
  const root = createFixture(context, 'stale-report')
  const bin = join(root, 'bin')
  mkdirSync(bin)
  writeFileSync(
    join(root, 'script/report.json'),
    JSON.stringify({ numPassedTests: 1, numFailedTests: 0, numTotalTests: 1, startTime: 1, success: true }),
  )
  const jest = join(bin, 'jest')
  writeFileSync(jest, '#!/bin/sh\nexit 1\n')
  chmodSync(jest, 0o755)

  const result = runRunner(root, [bin])
  const log = readLog(root)

  assert.deepEqual(log, [])
  assert.equal(result.status, 1, result.stdout + result.stderr)
})

test('rechaza un reporte verde incompleto sin contador de fallos', (context) => {
  const root = createFixture(context, 'invalid-report')
  const bin = join(root, 'bin')
  mkdirSync(bin)
  const jest = join(bin, 'jest')
  writeFileSync(
    jest,
    "#!/bin/sh\ncat > script/report.json <<'JSON'\n{\"numPassedTests\":1,\"numTotalTests\":1,\"startTime\":1,\"success\":true}\nJSON\nexit 0\n",
  )
  chmodSync(jest, 0o755)

  const result = runRunner(root, [bin])

  assert.equal(result.status, 1, result.stdout + result.stderr)
})
