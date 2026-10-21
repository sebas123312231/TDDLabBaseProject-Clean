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
const limitedReports = Array.from({ length: 50 }, (_, index) => ({
  ...reports[0],
  id: `catalog-${index + 1}`,
}))

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
    cy.get('[role="dialog"]').within(() => {
      cy.contains('.card-meta', 'Encontrado · Objeto · Publicado el').should('be.visible')
      cy.contains('.card-meta', 'Centro, La Paz').should('be.visible')
      cy.contains('.hint', 'Tu correo no se muestra.').should('be.visible')
      cy.contains('button', 'Guardar').should('have.attr', 'aria-pressed', 'false').click()
      cy.contains('button', 'Guardado').should('have.attr', 'aria-pressed', 'true')
    })
    cy.get('[role="status"]').should('contain', 'Guardaste este reporte')
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

  it('labels the map as illustrative and opens a report from a pin', () => {
    cy.contains('button', 'Mapa').click()
    cy.get('[role="region"][aria-label="Mapa ilustrativo de reportes"]').within(() => {
      cy.get('button').first().click()
    })
    cy.get('[role="dialog"]').should('be.visible')
  })

  it('shows the four safety recommendations and privacy explanation', () => {
    cy.contains('button', 'Seguridad y privacidad').click()
    cy.contains('h2', 'Antes de encontrarse').should('be.visible')
    cy.contains('b', 'Elige un lugar público').should('be.visible')
    cy.contains('b', 'Ve acompañado si puedes').should('be.visible')
    cy.contains('b', 'Comparte solo lo necesario').should('be.visible')
    cy.contains('b', 'Confirma los detalles').should('be.visible')
    cy.contains('h2', 'Tu privacidad en PerdiU').should('be.visible')
    cy.contains('El correo de tu cuenta nunca se muestra en el catálogo.').should('be.visible')
  })

  it('explains that account email stays private in the public catalog', () => {
    cy.contains('button', 'Seguridad y privacidad').click()
    cy.contains('h2', 'Tu privacidad en PerdiU').should('be.visible')
    cy.contains('El correo de tu cuenta nunca se muestra en el catálogo.').should('be.visible')
  })

  it('opens and closes the navigation on a narrow screen', () => {
    cy.viewport(390, 844)
    cy.get('button[aria-label="Abrir menú"]').click()
    cy.get('.sidebar').should('have.class', 'sidebar-open')
    cy.get('.sidebar-close').click()
    cy.get('.sidebar').should('not.have.class', 'sidebar-open')
  })

  it('marks the selected section and updates the header title', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mapa').click()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mapa')
      .should('have.attr', 'aria-current', 'page')
    cy.get('.app-header').should('contain', 'Mapa')
  })

  it('clears the catalog search filter', () => {
    cy.contains('button', 'Explorar reportes').click()
    cy.intercept('GET', /\/api\/reports\?q=/).as('filteredCatalog')
    cy.contains('label', 'Buscar').find('input').type('mochila')
    cy.wait('@filteredCatalog')
    cy.contains('button', 'Limpiar').click()
    cy.contains('label', 'Buscar').find('input').should('have.value', '')
  })

  it('guides someone from an empty saved list back to the catalog', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Guardados').click()
    cy.get('.report-grid').contains('button', 'Guardado').click()
    cy.get('.empty-state').within(() => {
      cy.contains('Tu lista está vacía por ahora').should('be.visible')
      cy.contains('Guarda reportes con el ícono de corazón y aparecerán aquí.').should('be.visible')
      cy.contains('button', 'Explorar reportes').click()
    })
    cy.get('.app-header').should('contain', 'Explorar reportes')
  })

  it('offers publication when catalog filters find no reports', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Explorar reportes').click()
    cy.intercept('GET', /\/api\/reports\?q=/, { body: [] }).as('emptyCatalog')
    cy.contains('label', 'Buscar').find('input').type('sin-coincidencias')
    cy.wait('@emptyCatalog')
    cy.get('.empty-state').within(() => {
      cy.contains('No se encontraron coincidencias').should('be.visible')
      cy.contains('Prueba con otra búsqueda o publica un reporte.').should('be.visible')
      cy.contains('button', 'Publicar reporte').click()
    })
    cy.get('input[type="email"]').should('be.visible')
  })

  it('explains when the catalog has reached its result limit', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Explorar reportes').click()
    cy.intercept('GET', /\/api\/reports\?q=/, { body: limitedReports }).as('limitedCatalog')
    cy.contains('label', 'Buscar').find('input').type('limite')
    cy.get('@limitedCatalog.all').should('have.length', 6)
    cy.get('.hint[role="status"]')
      .should('contain', 'Se muestran hasta 50 resultados.')
      .and('contain', 'Ajusta los filtros para precisar la búsqueda.')
  })
})
