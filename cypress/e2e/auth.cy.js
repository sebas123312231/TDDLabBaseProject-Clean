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

  it('asocia los errores de correo y contraseña con sus campos', () => {
    cy.intercept('GET', '/api/reports*', { body: [] })
    cy.visit('/')

    cy.contains('nav[aria-label="Navegación del panel"] button', 'Publicar reporte').click()
    cy.get('input[type="email"]').type('no-es-correo')
    cy.get('.auth-card button[type="submit"]').click()

    cy.get('input[type="email"]').should('have.attr', 'aria-describedby', 'email-error')
    cy.get('#email-error').should('be.visible')
    cy.get('input[type="password"]').should(
      'have.attr',
      'aria-describedby',
      'password-error',
    )
    cy.get('#password-error').should('be.visible')
  })

  it('bloquea la edición de credenciales mientras espera al proveedor', () => {
    cy.intercept('GET', '/api/reports*', { body: [] })
    cy.intercept('POST', '**/auth/token?grant_type=password', {
      delay: 1500,
      statusCode: 400,
      body: { code: 'invalid_credentials' },
    }).as('login')
    cy.visit('/')

    cy.contains('nav[aria-label="Navegación del panel"] button', 'Publicar reporte').click()
    cy.get('input[type="email"]').type('persona@example.test')
    cy.get('input[type="password"]').type('Incorrecta-123')
    cy.get('.auth-card button[type="submit"]').click()

    cy.get('input[type="email"]').should('be.disabled')
    cy.get('input[type="password"]').should('be.disabled')
    cy.wait('@login')
  })

  it('expone nombres y autocompletado adecuados para inicio y registro', () => {
    cy.intercept('GET', '/api/reports*', { body: [] })
    cy.visit('/')

    cy.contains('nav[aria-label="Navegación del panel"] button', 'Publicar reporte').click()
    cy.get('input[type="email"]')
      .should('have.attr', 'name', 'email')
      .and('have.attr', 'inputmode', 'email')
      .and('have.attr', 'required')
    cy.get('input[type="password"]')
      .first()
      .should('have.attr', 'name', 'password')
      .and('have.attr', 'autocomplete', 'current-password')
      .and('have.attr', 'required')

    cy.get('.auth-card button').last().click()
    cy.get('input[type="password"]')
      .first()
      .should('have.attr', 'autocomplete', 'new-password')
    cy.get('input[type="password"]')
      .eq(1)
      .should('have.attr', 'name', 'confirmPassword')
      .and('have.attr', 'autocomplete', 'new-password')
      .and('have.attr', 'required')
  })
})
