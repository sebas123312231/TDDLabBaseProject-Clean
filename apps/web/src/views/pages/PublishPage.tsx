import type { AppView } from '../../presenters/app/useApp.js'
import { publishOptions } from '../../presenters/reports/publish.presenter.js'

export function PublishPage({ app }: { app: AppView }) {
  return (
    <form className="publish-form" onSubmit={(event) => { event.preventDefault(); app.actions.publish.submit() }}>
      <label>Tipo<select value={app.publish.draft.type} onChange={(event) => app.actions.publish.setType(event.target.value as 'lost' | 'found')}><option value="lost">Perdido</option><option value="found">Encontrado</option></select></label>
      <label>Categoría<select value={app.publish.draft.category} onChange={(event) => app.actions.publish.setField('category', event.target.value as 'pet' | 'object' | 'document')}>{publishOptions.categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>Nombre<input value={app.publish.draft.title} onChange={(event) => app.actions.publish.setField('title', event.target.value)} /></label>
      {app.publish.errors.title && <small role="alert">{app.publish.errors.title}</small>}
      <label>Descripción<textarea value={app.publish.draft.description} onChange={(event) => app.actions.publish.setField('description', event.target.value)} /></label>
      {app.publish.errors.description && <small role="alert">{app.publish.errors.description}</small>}
      <label>Ciudad<select value={app.publish.draft.city} onChange={(event) => app.actions.publish.setField('city', event.target.value)}>{publishOptions.cities.map((city) => <option key={city}>{city}</option>)}</select></label>
      <label>Zona o barrio<input value={app.publish.draft.zone} onChange={(event) => app.actions.publish.setField('zone', event.target.value)} /></label>
      {app.publish.errors.zone && <small role="alert">{app.publish.errors.zone}</small>}
      <label>Fecha del incidente<input type="date" value={app.publish.draft.incidentDate} onChange={(event) => app.actions.publish.setField('incidentDate', event.target.value)} /></label>
      <label>Fotografía<input type="file" accept="image/jpeg,image/png" onChange={(event) => { const file = event.target.files?.[0]; if (file) app.actions.publish.choosePhoto(file) }} /></label>
      {app.publish.imagePreview && <><img className="photo-preview" src={app.publish.imagePreview} alt="Vista previa" /><button className="text-button" type="button" onClick={app.actions.publish.clearPhoto}>Quitar foto</button></>}
      <button className="primary-button" type="submit">Publicar reporte</button>
    </form>
  )
}
