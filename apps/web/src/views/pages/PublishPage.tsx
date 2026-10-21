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
    <form className="publish-form" onSubmit={submit} noValidate>
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

      <label>
        Categoría
        <select
          value={form.draft.category}
          onChange={(event) => actions.setField('category', event.target.value as typeof form.draft.category)}
        >
          {publishOptions.categories.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label>
        Nombre
        <input value={form.draft.title} onChange={(event) => actions.setField('title', event.target.value)} />
      </label>
      {form.errors.title && <small role="alert">{form.errors.title}</small>}
      <label>
        Descripción
        <textarea value={form.draft.description} onChange={(event) => actions.setField('description', event.target.value)} />
      </label>
      {form.errors.description && <small role="alert">{form.errors.description}</small>}
      <label>
        Ciudad
        <select value={form.draft.city} onChange={(event) => actions.setField('city', event.target.value)}>
          {publishOptions.cities.map((city) => <option key={city}>{city}</option>)}
        </select>
      </label>
      <label>
        Zona o barrio
        <input value={form.draft.zone} onChange={(event) => actions.setField('zone', event.target.value)} />
      </label>
      {form.errors.zone && <small role="alert">{form.errors.zone}</small>}
      <label>
        Fecha del incidente
        <input type="date" value={form.draft.incidentDate} onChange={(event) => actions.setField('incidentDate', event.target.value)} />
      </label>
      <label>
        Fotografía
        <input type="file" accept="image/jpeg,image/png" onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) actions.choosePhoto(file)
        }} />
      </label>
      {form.imagePreview && (
        <>
          <img className="photo-preview" src={form.imagePreview} alt="Vista previa" />
          <button className="text-button" type="button" onClick={actions.clearPhoto}>Quitar foto</button>
        </>
      )}
      <button className="primary-button" type="submit">Publicar reporte</button>
    </form>
  )
}
