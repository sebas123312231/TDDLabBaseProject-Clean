import type {
  DraftField,
  DraftIssue,
  ReportDraft,
} from '../../models/reports/publication.js'
import { isAcceptedPhoto, publishDemoReport, validateDraft } from '../../models/reports/publication.js'
import { cities, demoOwner, type Report } from '../../models/reports/report.js'
import type { Effects, PhotoFile } from '../effects.js'
import { Store } from '../store.js'
import { categoryLabels } from './report-card.js'

type Draft = Omit<ReportDraft, 'imageUrl'>

export interface PublishState {
  draft: Draft
  imagePreview: string
  errors: Partial<Record<DraftField, string>>
}

interface Dependencies {
  reports: { add(report: Report): void }
  filters: { reset(): void }
  notices: { show(message: string, error?: boolean): void }
  effects: Pick<Effects, 'createPreview' | 'revokePreview' | 'now' | 'newId'>
  onPublished: () => void
}

const emptyDraft: Draft = {
  type: 'lost',
  category: 'pet',
  title: '',
  description: '',
  city: 'La Paz',
  zone: '',
  incidentDate: '',
}

const issueMessages: Record<DraftField, Partial<Record<DraftIssue, string>>> = {
  title: {
    required: 'Escribe un nombre para el reporte.',
    too_short: 'Usa al menos 3 caracteres.',
  },
  description: {
    required: 'Describe lo que perdiste o encontraste.',
    too_short: 'Usa al menos 20 caracteres para que puedan reconocerlo.',
  },
  zone: { required: 'Indica la zona o el barrio.' },
}

export const publishOptions = {
  categories: Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
  cities: [...cities],
}

export class PublishPresenter extends Store<PublishState> {
  constructor(private readonly dependencies: Dependencies) {
    super({ draft: emptyDraft, imagePreview: '', errors: {} })
  }

  setType = (type: Draft['type']) => this.setField('type', type)

  setField = <Field extends keyof Draft>(field: Field, value: Draft[Field]) => {
    const errors = { ...this.state.errors }
    delete errors[field as DraftField]
    this.setState({ ...this.state, draft: { ...this.state.draft, [field]: value }, errors })
  }

  choosePhoto = (file: PhotoFile) => {
    if (!isAcceptedPhoto(file)) {
      this.dependencies.notices.show('Elige una imagen JPG o PNG de máximo 5 MB.')
      return
    }
    this.clearPhoto()
    this.setState({ ...this.state, imagePreview: this.dependencies.effects.createPreview(file) })
  }

  clearPhoto = () => {
    if (this.state.imagePreview) this.dependencies.effects.revokePreview(this.state.imagePreview)
    this.setState({ ...this.state, imagePreview: '' })
  }

  submit = () => {
    const issues = validateDraft(this.state.draft)
    if (Object.keys(issues).length) {
      const errors: PublishState['errors'] = {}
      for (const [field, issue] of Object.entries(issues) as [DraftField, DraftIssue][])
        errors[field] = issueMessages[field][issue]
      this.setState({ ...this.state, errors })
      return false
    }
    const { effects, reports, filters, notices, onPublished } = this.dependencies
    reports.add(
      publishDemoReport(
        {
          ...this.state.draft,
          ...(this.state.imagePreview ? { imageUrl: this.state.imagePreview } : {}),
        },
        { id: effects.newId(), now: effects.now(), owner: demoOwner },
      ),
    )
    this.setState({ draft: emptyDraft, imagePreview: '', errors: {} })
    filters.reset()
    onPublished()
    notices.show('Tu reporte ya está publicado. Puedes gestionarlo desde Mis reportes.')
    return true
  }

  reset = () => {
    this.clearPhoto()
    this.setState({ draft: emptyDraft, imagePreview: '', errors: {} })
  }
}
