import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { BadRequestException } from '@nestjs/common'
import { parseReportQuery } from '../src/reports/query.js'

test('la búsqueda recorta espacios y omite un término vacío', () => {
  assert.deepEqual(parseReportQuery({ q: '  cámara perdida  ' }), { q: 'cámara perdida' })
  assert.deepEqual(parseReportQuery({ q: '   ' }), {})
})

test('el catálogo conserva filtros válidos y recorta el texto de ciudad', () => {
  assert.deepEqual(
    parseReportQuery({ type: 'lost', category: 'pet', city: '  La Paz  ' }),
    { type: 'lost', category: 'pet', city: 'La Paz' },
  )
})

test('la búsqueda rechaza filtros desconocidos o fuera del contrato', () => {
  for (const input of [
    { type: 'resolved' },
    { category: 'vehicle' },
    { limit: '100' },
    { type: ['lost', 'found'] },
  ]) {
    assert.throws(
      () => parseReportQuery(input),
      (error) =>
        error instanceof BadRequestException &&
        error.message === 'Parámetros de búsqueda inválidos.',
    )
  }
})

test('la búsqueda rechaza valores demasiado largos o con caracteres de control', () => {
  for (const input of [
    { q: 'x'.repeat(201) },
    { city: 'x'.repeat(101) },
    { q: 'texto\u0000oculto' },
  ]) {
    assert.throws(
      () => parseReportQuery(input),
      (error) =>
        error instanceof BadRequestException &&
        error.message === 'Parámetros de búsqueda inválidos.',
    )
  }
})
