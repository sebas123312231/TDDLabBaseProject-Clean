import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from '@jest/globals'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { webLayerViolations } from '../lib/web-layers.mjs'

const webSource = resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/web/src')

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

test('la View rechaza imports directos del Model', () => {
  const violations = webLayerViolations(
    'views/pages/ExplorePage.tsx',
    "import { matchesFilters } from '../../models/reports/filters.js'",
  )

  assert.equal(violations.length, 1)
  assert.match(violations[0], /views no debe importar models/)
})

test('la View rechaza imports directos de Infrastructure', () => {
  const violations = webLayerViolations(
    'views/pages/ExplorePage.tsx',
    "import { createReportsClient } from '../../infrastructure/http/catalog-client.js'",
  )

  assert.equal(violations.length, 1)
  assert.match(violations[0], /views no debe importar infrastructure/)
})

test('el núcleo del Presenter rechaza React', () => {
  const violations = webLayerViolations(
    'presenters/catalog/catalog.presenter.ts',
    "import { useState } from 'react'",
  )

  assert.equal(violations.length, 1)
  assert.match(violations[0], /presenters no debe importar react/)
})

test('los hooks adaptadores use*.ts pueden importar React', () => {
  assert.deepEqual(
    webLayerViolations('presenters/useStore.ts', "import { useSyncExternalStore } from 'react'"),
    [],
  )
})

test('el Model no importa React', () => {
  const violations = webLayerViolations(
    'models/reports/filters.ts',
    "import { useState } from 'react'",
  )

  assert.equal(violations.length, 1)
  assert.match(violations[0], /models no debe importar react/)
})

test('el Model rechaza archivos TSX porque la interfaz pertenece a la View', () => {
  const violations = webLayerViolations('models/reports/ReportCard.tsx', '')

  assert.equal(violations.length, 1)
  assert.match(violations[0], /models no debe contener JSX/)
})

test('rechaza archivos que no pertenecen a una capa MVP reconocida', () => {
  const violations = webLayerViolations('widgets/Unknown.tsx', '')

  assert.equal(violations.length, 1)
  assert.match(violations[0], /capa MVP reconocida/)
})

test('el Model rechaza llamadas directas al navegador', () => {
  const violations = webLayerViolations(
    'models/reports/filters.ts',
    "export const load = () => fetch('/api/reports')",
  )

  assert.equal(violations.length, 1)
  assert.match(violations[0], /models no debe usar APIs del navegador/)
})

test('el Presenter rechaza llamadas directas al navegador', () => {
  const violations = webLayerViolations(
    'presenters/app/shell.presenter.ts',
    "export const open = () => window.open('/profile')",
  )

  assert.equal(violations.length, 1)
  assert.match(violations[0], /presenters no debe usar APIs del navegador/)
})

test('el Presenter no importa Views ni Infrastructure', () => {
  const violations = webLayerViolations(
    'presenters/catalog/catalog.presenter.ts',
    [
      "import { ExplorePage } from '../../views/pages/ExplorePage.js'",
      "import { createReportsClient } from '../../infrastructure/http/catalog-client.js'",
    ].join('\n'),
  )

  assert.equal(violations.length, 2)
  assert.match(violations.join('\n'), /presenters no debe importar views/)
  assert.match(violations.join('\n'), /presenters no debe importar infrastructure/)
})

test('Infrastructure rechaza dependencias hacia la View', () => {
  const violations = webLayerViolations(
    'infrastructure/http/catalog-client.ts',
    "import { ReportCard } from '../../views/components/ReportCard.js'",
  )

  assert.equal(violations.length, 1)
  assert.match(violations[0], /infrastructure no debe importar views/)
})

test('el Model no importa Presenters ni Infrastructure', () => {
  const violations = webLayerViolations(
    'models/reports/filters.ts',
    [
      "import { CatalogPresenter } from '../../presenters/catalog/catalog.presenter.js'",
      "import { createReportsClient } from '../../infrastructure/http/catalog-client.js'",
    ].join('\n'),
  )

  assert.equal(violations.length, 2)
  assert.match(violations.join('\n'), /models no debe importar presenters/)
  assert.match(violations.join('\n'), /models no debe importar infrastructure/)
})

test('el Model solo acepta contracts como dependencia externa', () => {
  const violations = webLayerViolations(
    'models/reports/filters.ts',
    [
      "import type { ReportQuery } from '@perdiu/contracts'",
      "import axios from 'axios'",
    ].join('\n'),
  )

  assert.equal(violations.length, 1)
  assert.match(violations[0], /models no debe importar axios/)
})

test('el código web actual respeta los límites MVP', () => {
  const violations = sourceFiles(webSource).flatMap((file) =>
    webLayerViolations(relative(webSource, file).split('/').join('/'), readFileSync(file, 'utf8')),
  )

  assert.equal(violations.length, 0, violations.join('\n'))
})
