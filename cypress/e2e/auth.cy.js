describe('Autenticación PerdiU', () => {
  it('no revela si el correo puede registrarse al confirmar el envío', () => {
    cy.intercept('GET', '/api/reports*', { body: [] })
    cy.intercept('POST', '**/auth/signup*', {
      statusCode: 200,
      body: {
        id: 'user-1',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'persona@example.test',
        user_metadata: {},
      },
    }).as('signup')
    cy.visit('/')

    cy.contains('nav[aria-label="Navegación del panel"] button', 'Publicar reporte').click()
    cy.get('.auth-card button').last().click()
    cy.get('input[type="email"]').type('persona@example.test')
    cy.get('input[type="password"]').eq(0).type('Correcta-123')
    cy.get('input[type="password"]').eq(1).type('Correcta-123')
    cy.get('.auth-card button[type="submit"]').click()

    cy.wait('@signup')
    cy.get('[role="status"]')
      .should('contain', 'Si')
      .and('contain', 'puede registrarse')
      .and('contain', 'persona@example.test')
  })
})
