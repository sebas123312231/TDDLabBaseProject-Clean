import { demoOwner, isOwnedBy, type CatalogReport, type Report } from '../../models/reports/report.js'
import { removeReport, resolveReport } from '../../models/reports/publication.js'
import { summarizeReports } from '../../models/reports/stats.js'
import { matchesFilters } from '../../models/reports/filters.js'
import { toReportFilters, type FilterSelection } from '../catalog/filters.presenter.js'
import { Store } from '../store.js'
import { toReportCard } from './report-card.js'

export type OwnFilter = 'Todos' | 'Activos' | 'Resueltos'

export interface ReportsState {
  reports: Report[]
  saved: string[]
  savedCatalog: CatalogReport[]
  selected: Report | null
  ownFilter: OwnFilter
}

export interface MapPin {
  id: string
  label: string
  tone: Report['type']
  top: string
  left: string
  number: number
}

interface Dependencies {
  catalog: { find(id: string): CatalogReport | undefined }
  notices: { show(message: string, error?: boolean): void }
  effects: { openWhatsApp(phone: string, message: string): void }
}

const isActive = (report: Report) => report.state === 'active'

export class ReportsPresenter extends Store<ReportsState> {
  constructor(
    reports: Report[],
    private readonly dependencies: Dependencies,
    saved: string[] = [],
  ) {
    super({ reports, saved, savedCatalog: [], selected: null, ownFilter: 'Todos' })
  }

  private update(patch: Partial<ReportsState>) {
    this.setState({ ...this.state, ...patch })
  }

  private own() {
    return this.state.reports.filter((report) => isOwnedBy(report, demoOwner.id))
  }

  add = (report: Report) => this.update({ reports: [report, ...this.state.reports] })

  toggleSaved = (id: string) => {
    const { saved, savedCatalog, selected } = this.state
    const wasSaved = saved.includes(id)
    const catalogReport =
      this.dependencies.catalog.find(id) ??
      (selected?.source === 'catalog' && selected.id === id ? selected : undefined)
    const retained = savedCatalog.filter((report) => report.id !== id)
    this.update({
      saved: wasSaved ? saved.filter((item) => item !== id) : [...saved, id],
      savedCatalog: !wasSaved && catalogReport ? [...retained, catalogReport] : retained,
    })
    this.dependencies.notices.show(
      wasSaved
        ? 'Quitaste este reporte de tus guardados.'
        : 'Guardaste este reporte para revisarlo después.',
    )
  }

  isSaved = (id: string) => this.state.saved.includes(id)

  saved = () => {
    const { saved, savedCatalog, reports } = this.state
    return [...savedCatalog, ...reports]
      .filter((report) => saved.includes(report.id) && report.state === 'active')
      .map(toReportCard)
  }

  private find(id: string): Report | undefined {
    const { reports, savedCatalog } = this.state
    return (
      reports.find((report) => report.id === id) ??
      savedCatalog.find((report) => report.id === id) ??
      this.dependencies.catalog.find(id)
    )
  }

  open = (id: string) => this.update({ selected: this.find(id) ?? null })
  close = () => this.update({ selected: null })

  detail = () => {
    const { selected } = this.state
    const report = selected && (this.find(selected.id) ?? selected)
    if (!report) return null
    const canResolve = isOwnedBy(report, demoOwner.id) && report.state === 'active'
    return {
      card: toReportCard(report),
      saved: this.isSaved(report.id),
      canContact: !canResolve && report.source === 'demo',
      canResolve,
    }
  }

  contact = (id: string) => {
    const report = this.find(id)
    if (report?.source !== 'demo') return
    this.dependencies.effects.openWhatsApp(
      report.phone,
      'Hola, vi tu reporte "' + report.title + '" en PerdiU. ¿Podemos coordinar?',
    )
  }

  resolve = (id: string) => {
    const reports = resolveReport(this.state.reports, id, demoOwner.id)
    if (reports === this.state.reports) return
    this.update({ reports })
    this.dependencies.notices.show(
      'Marcaste el reporte como resuelto; ya no aparecerá en las búsquedas.',
    )
  }

  remove = (id: string) => {
    const reports = removeReport(this.state.reports, id, demoOwner.id)
    if (reports === this.state.reports) return
    const { saved, selected } = this.state
    this.update({
      reports,
      saved: saved.filter((item) => item !== id),
      selected: selected?.id === id ? null : selected,
    })
    this.dependencies.notices.show('El reporte se quitó de la lista.')
  }

  setOwnFilter = (ownFilter: OwnFilter) => this.update({ ownFilter })
  clearPrivateData = () => this.update({ saved: [], savedCatalog: [], selected: null })

  counts = () => ({ own: this.own().length, saved: this.state.saved.length })

  myReports = () => {
    const { ownFilter: filter } = this.state
    const own = this.own()
    const visible = own.filter(
      (report) =>
        filter === 'Todos' || (filter === 'Activos' ? isActive(report) : !isActive(report)),
    )
    return {
      filter,
      total: own.length,
      active: own.filter(isActive).length,
      cards: visible.map(toReportCard),
      empty: {
        title:
          filter === 'Resueltos'
            ? 'Todavía no tienes reportes resueltos'
            : 'Aún no publicaste reportes',
      },
    }
  }

  overview = () => {
    const stats = summarizeReports(this.state.reports)
    return {
      metrics: [
        { label: 'Reportes activos', value: stats.active },
        { label: 'Perdidos', value: stats.lost },
        { label: 'Encontrados', value: stats.found },
        { label: 'Resueltos', value: stats.resolved },
      ],
      cities: [...stats.byCity, { city: 'Otras ciudades', count: stats.other }],
      recent: this.state.reports.filter(isActive).slice(0, 3).map(toReportCard),
    }
  }

  mapView = (selection: FilterSelection) => {
    const filters = toReportFilters(selection)
    const visible = this.state.reports.filter((report) => matchesFilters(report, filters))
    const pins: MapPin[] = visible
      .filter((report) => report.source === 'demo')
      .slice(0, 8)
      .map((report, index) => ({
        id: report.id,
        label: 'Ver ' + report.title,
        tone: report.type,
        top: report.position.top,
        left: report.position.left,
        number: index + 1,
      }))
    return { count: visible.length, pins, list: visible.slice(0, 7).map(toReportCard) }
  }
}
