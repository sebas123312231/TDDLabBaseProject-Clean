describe('Catálogo conectado a API y PostgreSQL', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/reports*').as('catalog')
    cy.visit('/')
    cy.wait('@catalog').its('response.statusCode').should('eq', 200)
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Explorar reportes').click()
  })

  it('muestra solo reportes activos persistidos y protege los datos de contacto', () => {
    cy.get('.report-card').should('have.length', 2)
    cy.contains('Mochila azul encontrada').should('be.visible')
    cy.contains('Gato de prueba perdido').should('be.visible')
    cy.contains('Documento de prueba devuelto').should('not.exist')

    cy.contains('button', 'Mochila azul encontrada').click()
    cy.get('[role="dialog"]')
      .should('contain', 'Santiago Demo')
      .and('not.contain', '59170000001')
      .and('not.contain', 'fictional@example.invalid')
  })

  it('envía la búsqueda al API real y representa la respuesta persistida', () => {
    cy.intercept({ method: 'GET', pathname: '/api/reports', query: { q: 'mochila' } }).as('search')
    cy.get('input[aria-label="Buscar reportes"]').type('mochila')
    cy.wait('@search').then(({ response }) => {
      expect(response.statusCode).to.equal(200)
      expect(response.body.map((report) => report.title)).to.deep.equal(['Mochila azul encontrada'])
    })
    cy.get('.report-card').should('have.length', 1)
  })
})
