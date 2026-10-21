import type { AppView } from '../../presenters/app/useApp.js'
import { filterOptions } from '../../presenters/catalog/filters.presenter.js'
import { publishOptions } from '../../presenters/reports/publish.presenter.js'
import { ReportGrid } from '../components/ReportGrid.js'
import { OverviewPage } from './OverviewPage.js'

export function SectionContent({ app }: { app: AppView }) {
  const cards = {
    isSaved: app.isSaved,
    onSave: app.actions.reports.toggleSaved,
    onOpen: app.actions.reports.open,
  }
  const { section } = app.shell

  if (section === 'overview')
    return <OverviewPage app={app} />

  if (section === 'explore')
    return (
      <>
        <p>Busca por palabra, ciudad o categoría.</p>
        <div className="filter-row">
          <label>Buscar<input value={app.selection.search} onChange={(event) => app.actions.filters.setSearch(event.target.value)} /></label>
          <label>Ciudad<select value={app.selection.city} onChange={(event) => app.actions.filters.setCity(event.target.value)}>{filterOptions.cities.map((city) => <option key={city}>{city}</option>)}</select></label>
          <label>Categoría<select value={app.selection.category} onChange={(event) => app.actions.filters.setCategory(event.target.value)}>{filterOptions.categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Tipo<select value={app.selection.status} onChange={(event) => app.actions.filters.setStatus(event.target.value as typeof app.selection.status)}>{filterOptions.statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
          <button className="secondary-button" onClick={app.actions.filters.reset}>Limpiar</button>
        </div>
        {app.catalog.status === 'loading' && <p role="status">Cargando reportes…</p>}
        {app.catalog.status === 'error' && <div role="alert"><p>{app.catalog.message}</p><button className="secondary-button" onClick={app.actions.retryCatalog}>Reintentar</button></div>}
        {app.catalog.status === 'ready' && <><p>{app.catalog.count} resultados</p>{app.catalog.count ? <ReportGrid reports={app.catalog.reports} {...cards} /> : <p>{app.catalog.empty.title}. {app.catalog.empty.description}</p>}</>}
      </>
    )

  if (section === 'map')
    return (
      <>
        <p>Mapa ilustrativo de reportes; las posiciones no representan ubicaciones geográficas.</p>
        <div className="illustrative-map" role="img" aria-label="Representación ilustrativa de reportes en Bolivia">
          {app.map.pins.map((pin) => <button key={pin.id} style={{ top: pin.top, left: pin.left }} aria-label={pin.label} onClick={() => app.actions.reports.open(pin.id)}>{pin.number}</button>)}
        </div>
        <ReportGrid reports={app.map.list} {...cards} />
      </>
    )

  if (section === 'publish')
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

  if (section === 'my-reports')
    return (
      <>
        <div className="filter-row" aria-label="Filtrar mis reportes">{(['Todos', 'Activos', 'Resueltos'] as const).map((filter) => <button className="secondary-button" key={filter} aria-pressed={app.myReports.filter === filter} onClick={() => app.actions.reports.setOwnFilter(filter)}>{filter}</button>)}</div>
        {app.myReports.cards.length ? <ReportGrid reports={app.myReports.cards} {...cards} /> : <p>{app.myReports.empty.title}</p>}
        {app.myReports.cards.map((report) => <div className="report-actions" key={report.id}><button className="secondary-button" onClick={() => app.actions.reports.resolve(report.id)}>Marcar resuelto</button><button className="text-button" onClick={() => app.actions.reports.remove(report.id)}>Quitar</button></div>)}
      </>
    )

  if (section === 'saved')
    return app.saved.length ? <ReportGrid reports={app.saved} {...cards} /> : <p>Aún no tienes reportes guardados.</p>

  if (section === 'profile')
    return <section className="profile-card"><h2>{app.shell.account?.name ?? 'Invitado'}</h2><p>{app.shell.account?.email ?? 'Inicia sesión para ver tu perfil.'}</p><button className="secondary-button" onClick={() => void app.actions.signOut()}>Cerrar sesión</button></section>

  if (section === 'safety')
    return <section><h2>Cuida tu información</h2><p>Coordina con cuidado y evita publicar datos personales sensibles en los reportes públicos.</p></section>

  return null
}
