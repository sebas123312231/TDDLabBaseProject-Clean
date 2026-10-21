import type { FormEvent } from 'react'
import { publishOptions, type PublishPresenter, type PublishState } from '../../presenters/reports/publish.presenter.js'

type PublishPageProps = {
  form: PublishState
  actions: Pick<PublishPresenter, 'setType' | 'setField' | 'choosePhoto' | 'clearPhoto' | 'submit'>
}

export function PublishPage({ form, actions }: PublishPageProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    actions.submit()
  }

  return (
    <>
      <p className="page-description">
        Comparte lo esencial para que la comunidad pueda reconocerlo.
      </p>
      <form className="panel publish-form" onSubmit={submit} noValidate>
      <fieldset className="type-choice">
        <legend>¿Qué ocurrió?</legend>
        <button
          type="button"
          aria-pressed={form.draft.type === 'lost'}
          className={form.draft.type === 'lost' ? 'selected lost' : ''}
          onClick={() => actions.setType('lost')}
        >
          Perdí algo
        </button>
        <button
          type="button"
          aria-pressed={form.draft.type === 'found'}
          className={form.draft.type === 'found' ? 'selected found' : ''}
          onClick={() => actions.setType('found')}
        >
          Encontré algo
        </button>
      </fieldset>

      <div className="photo-field">
        {form.imagePreview ? (
          <>
            <img className="photo-preview" src={form.imagePreview} alt="Vista previa de la foto" />
            <button className="secondary-button" type="button" onClick={actions.clearPhoto}>
              Quitar foto
            </button>
          </>
        ) : (
          <label className="upload-zone">
            <strong>Selecciona una foto</strong>
            <small>JPG o PNG · Hasta 5 MB</small>
            <input
              type="file"
              accept="image/jpeg,image/png"
              aria-label="Subir fotografía"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) actions.choosePhoto(file)
              }}
            />
          </label>
        )}
      </div>
      <div className="form-grid">
        <label className="form-field form-wide">
          <span>Nombre del reporte</span>
          <input
            value={form.draft.title}
            onChange={(event) => actions.setField('title', event.target.value)}
            placeholder="Ej. Perrito café, mochila azul…"
            aria-invalid={Boolean(form.errors.title)}
            aria-describedby={form.errors.title ? 'title-error' : undefined}
          />
          {form.errors.title && <small id="title-error" role="alert">{form.errors.title}</small>}
        </label>
        <label className="form-field form-wide">
          <span>Descripción</span>
          <textarea
            value={form.draft.description}
            onChange={(event) => actions.setField('description', event.target.value)}
            placeholder="Color, características, cuándo y dónde…"
            aria-invalid={Boolean(form.errors.description)}
            aria-describedby={form.errors.description ? 'description-error' : 'description-hint'}
            rows={4}
          />
          {form.errors.description ? (
            <small id="description-error" role="alert">{form.errors.description}</small>
          ) : (
            <small id="description-hint" className="hint">
              Evita incluir números de documento, cuentas u otros datos sensibles.
            </small>
          )}
        </label>
        <label className="form-field">
          <span>Categoría</span>
          <select
            value={form.draft.category}
            onChange={(event) => actions.setField('category', event.target.value as typeof form.draft.category)}
          >
            {publishOptions.categories.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Ciudad</span>
          <select value={form.draft.city} onChange={(event) => actions.setField('city', event.target.value)}>
            {publishOptions.cities.map((city) => <option key={city}>{city}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Zona o barrio</span>
          <input
            value={form.draft.zone}
            onChange={(event) => actions.setField('zone', event.target.value)}
            aria-invalid={Boolean(form.errors.zone)}
            aria-describedby={form.errors.zone ? 'zone-error' : undefined}
          />
          {form.errors.zone && <small id="zone-error" role="alert">{form.errors.zone}</small>}
        </label>
        <label className="form-field">
          <span>Fecha aproximada</span>
          <input
            type="date"
            value={form.draft.incidentDate}
            onChange={(event) => actions.setField('incidentDate', event.target.value)}
          />
        </label>
      </div>
      <div className="form-footer">
        <small className="hint">Tu correo y tu número no aparecen públicamente.</small>
        <button className="primary-button" type="submit">Publicar reporte</button>
      </div>
      </form>
    </>
  )
}
