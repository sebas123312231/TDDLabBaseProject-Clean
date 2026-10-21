const reports = [
  {
    id: 'catalog-1',
    type: 'found',
    state: 'active',
    category: 'object',
    title: 'Mochila azul encontrada',
    description: 'Una mochila con cuaderno encontrada en el centro.',
    city: 'La Paz',
    zone: 'Centro',
    incidentDate: '2026-10-10',
    createdAt: '2026-10-11T12:00:00.000Z',
    author: { id: 'owner-1', displayName: 'Persona' },
    imageUrls: [],
  },
]

describe('PerdiU web', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/reports*', { body: reports }).as('catalog')
    cy.visit('/')
  })

  it('filters public reports, opens a detail and saves it on this device', () => {
    cy.wait('@catalog')
    cy.contains('button', 'Explorar reportes').click()
    cy.contains('Mochila azul encontrada').should('be.visible')
    cy.intercept('GET', /\/api\/reports\?q=/).as('filteredCatalog')
    cy.contains('label', 'Buscar').find('input').type('mochila')
    cy.get('@filteredCatalog.all').should('have.length', 7).then((requests) => {
      expect(requests.at(-1).request.url).to.contain('q=mochila')
    })
    cy.contains('button', 'Mochila azul encontrada').click()
    cy.get('[role="dialog"]').should('contain', 'Centro, La Paz')
    cy.get('[role="dialog"]').contains('button', 'Guardar reporte').click()
    cy.get('[role="dialog"]').find('[aria-pressed="true"]').should('exist')
    cy.get('[aria-label="Cerrar detalle"]').click()
    cy.contains('button', 'Guardados').click()
    cy.contains('Mochila azul encontrada').should('be.visible')
  })

  it('requires a session before opening publication and validates invalid email', () => {
    cy.contains('button', 'Publicar reporte').click()
    cy.get('input[type="email"]').type('correo-inválido')
    cy.contains('button', 'Iniciar sesión').last().click()
    cy.contains('Ingresa un correo electrónico válido.').should('be.visible')
  })

  it('shows report totals and the city breakdown on the overview', () => {
    cy.contains('.metric-grid', 'Reportes activos').should('contain', '7')
    cy.get('.city-list').should('contain', 'La Paz').and('contain', 'Cochabamba')
  })
})
