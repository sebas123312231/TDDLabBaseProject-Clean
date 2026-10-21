import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { Report } from '../../src/models/reports/report.js'
import { publishOptions, PublishPresenter } from '../../src/presenters/reports/publish.presenter.js'

function setup() {
  const added: Report[] = []
  const notices: string[] = []
  const revoked: string[] = []
  let resets = 0
  let published = 0
  const presenter = new PublishPresenter({
    reports: { add: (report) => added.push(report) },
    filters: { reset: () => resets++ },
    notices: { show: (message) => notices.push(message) },
    effects: {
      createPreview: (file) => 'blob:' + file.type,
      revokePreview: (url) => revoked.push(url),
      now: () => new Date('2026-10-20T15:00:00.000Z'),
      newId: () => 'demo-new',
    },
    onPublished: () => published++,
  })
  return { presenter, added, notices, revoked, counts: () => ({ resets, published }) }
}

test('inicia con los valores predeterminados del formulario vacío', () => {
  const { presenter } = setup()
  assert.deepEqual(presenter.getSnapshot(), {
    draft: {
      type: 'lost',
      category: 'pet',
      title: '',
      description: '',
      city: 'La Paz',
      zone: '',
      incidentDate: '',
    },
    imagePreview: '',
    errors: {},
  })
})

test('publica las ciudades y categorías válidas para el formulario', () => {
  assert.deepEqual(publishOptions, {
    categories: [
      { value: 'pet', label: 'Mascota' },
      { value: 'object', label: 'Objeto' },
      { value: 'document', label: 'Documentos' },
    ],
    cities: ['La Paz', 'Cochabamba', 'Santa Cruz'],
  })
})

test('rechaza un borrador vacío y asocia los errores a los campos', () => {
  const { presenter, added } = setup()

  assert.equal(presenter.submit(), false)
  assert.deepEqual(presenter.getSnapshot().errors, {
    title: 'Escribe un nombre para el reporte.',
    description: 'Describe lo que perdiste o encontraste.',
    zone: 'Indica la zona o el barrio.',
  })
  assert.deepEqual(added, [])
})

test('editar un campo actualiza el borrador y limpia solo su error', () => {
  const { presenter } = setup()
  presenter.submit()

  presenter.setField('title', 'Mochila azul')

  assert.equal(presenter.getSnapshot().draft.title, 'Mochila azul')
  assert.equal(presenter.getSnapshot().errors.title, undefined)
  assert.equal(presenter.getSnapshot().errors.description, 'Describe lo que perdiste o encontraste.')
  assert.equal(presenter.getSnapshot().errors.zone, 'Indica la zona o el barrio.')
})

test('rechaza fotos no admitidas y libera vistas previas reemplazadas o descartadas', () => {
  const { presenter, notices, revoked } = setup()
  presenter.choosePhoto({ type: 'image/gif', size: 10 })
  assert.equal(presenter.getSnapshot().imagePreview, '')
  assert.deepEqual(notices, ['Elige una imagen JPG o PNG de máximo 5 MB.'])

  presenter.choosePhoto({ type: 'image/png', size: 10 })
  presenter.choosePhoto({ type: 'image/jpeg', size: 10 })
  assert.equal(presenter.getSnapshot().imagePreview, 'blob:image/jpeg')
  presenter.clearPhoto()

  assert.deepEqual(revoked, ['blob:image/png', 'blob:image/jpeg'])
  assert.equal(presenter.getSnapshot().imagePreview, '')
})

test('publica un borrador válido como reporte demo, limpia el formulario y conserva su foto', () => {
  const { presenter, added, notices, revoked, counts } = setup()
  presenter.setType('found')
  presenter.setField('category', 'object')
  presenter.setField('title', 'Mochila azul')
  presenter.setField('description', 'La encontré en un minibús de la línea 2.')
  presenter.setField('zone', 'Miraflores')
  presenter.choosePhoto({ type: 'image/png', size: 10 })

  assert.equal(presenter.submit(), true)
  assert.deepEqual(added, [
    {
      id: 'demo-new',
      source: 'demo',
      type: 'found',
      state: 'active',
      category: 'object',
      title: 'Mochila azul',
      description: 'La encontré en un minibús de la línea 2.',
      city: 'La Paz',
      zone: 'Miraflores',
      incidentDate: '2026-10-20',
      createdAt: '2026-10-20T15:00:00.000Z',
      imageUrls: ['blob:image/png'],
      author: { id: 'demo-owner', displayName: 'Santiago Demo' },
      phone: '59170000000',
      position: { top: '48%', left: '48%' },
    },
  ])
  assert.deepEqual(counts(), { resets: 1, published: 1 })
  assert.deepEqual(notices, [
    'Tu reporte ya está publicado. Puedes gestionarlo desde Mis reportes.',
  ])
  assert.deepEqual(revoked, [])
  assert.equal(presenter.getSnapshot().draft.title, '')
  assert.equal(presenter.getSnapshot().imagePreview, '')
})

test('restablece el formulario y revoca una vista previa al descartar el borrador', () => {
  const { presenter, revoked } = setup()
  presenter.setField('title', 'Bicicleta azul')
  presenter.choosePhoto({ type: 'image/png', size: 10 })
  assert.equal(presenter.submit(), false)

  presenter.reset()

  assert.deepEqual(presenter.getSnapshot(), {
    draft: {
      type: 'lost',
      category: 'pet',
      title: '',
      description: '',
      city: 'La Paz',
      zone: '',
      incidentDate: '',
    },
    imagePreview: '',
    errors: {},
  })
  assert.deepEqual(revoked, ['blob:image/png'])
})
