function restoreTestAccount() {
  cy.intercept('GET', '/auth/user', {
    body: {
      id: 'user-1',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'persona@example.test',
      user_metadata: { display_name: 'Persona de prueba' },
    },
  }).as('providerUser')
  cy.intercept('GET', '/api/me', {
    body: {
      id: 'user-1',
      email: 'persona@example.test',
      displayName: 'Persona de prueba',
      photoUrl: 'https://cdn.example.test/avatar.png',
    },
  }).as('account')
  cy.window().then((window) => {
    window.localStorage.setItem('perdiu-auth', JSON.stringify({
      access_token: 'isolated-test-token',
      refresh_token: 'isolated-test-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'user-1',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'persona@example.test',
        user_metadata: { display_name: 'Persona de prueba' },
      },
    }))
  })
  cy.reload()
  cy.wait('@account')
}

describe('PerdiU page headings', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/reports*', { body: [] }).as('catalog')
    cy.visit('/')
    cy.wait('@catalog')
  })

  it('groups the overview title and description in its page heading', () => {
    cy.get('.content .page-heading').within(() => {
      cy.get('h1').should('have.text', 'Resumen')
      cy.contains('p', 'Actividad de los reportes de demostración de la comunidad.')
        .should('be.visible')
      cy.contains('button', 'Nuevo reporte').should('be.visible')
    })
  })

  it('groups the catalog title and description in its page heading', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Explorar reportes').click()
    cy.get('.content .page-heading').within(() => {
      cy.get('h1').should('have.text', 'Explorar reportes')
      cy.contains('p', 'Busca por palabra, ciudad o categoría.').should('be.visible')
    })
  })

  it('groups the map title, description, and publish action in its page heading', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mapa').click()
    cy.get('.content .page-heading').within(() => {
      cy.get('h1').should('have.text', 'Mapa de reportes')
      cy.contains('p', 'Ubica reportes cercanos y abre cada punto para ver sus detalles.')
        .should('be.visible')
      cy.contains('button', 'Nuevo reporte').should('be.visible')
    })
  })

  it('groups the saved reports title and description in its page heading', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Guardados').click()
    cy.get('.content .page-heading').within(() => {
      cy.get('h1').should('have.text', 'Reportes guardados')
      cy.contains('p', 'Publicaciones que quieres revisar o seguir más tarde en este dispositivo.')
        .should('be.visible')
    })
  })

  it('groups the safety title and description in its page heading', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Seguridad y privacidad').click()
    cy.get('.content .page-heading').within(() => {
      cy.get('h1').should('have.text', 'Seguridad y privacidad')
      cy.contains('p', 'Recomendaciones para coordinar una devolución cuidando tus datos.')
        .should('be.visible')
    })
  })

  it('groups the publication title and description in its page heading', () => {
    restoreTestAccount()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Publicar reporte').click()
    cy.get('.content .page-heading').within(() => {
      cy.get('h1').should('have.text', 'Publicar reporte')
      cy.contains('p', 'Comparte lo esencial para que la comunidad pueda reconocerlo.')
        .should('be.visible')
    })
  })

  it('groups own report totals and the new report action in its page heading', () => {
    restoreTestAccount()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mis reportes').click()
    cy.get('.content .page-heading').within(() => {
      cy.get('h1').should('have.text', 'Mis reportes')
      cy.contains('p', '1 publicados · 1 activos. Solo tú puedes cambiar su estado.')
        .should('be.visible')
      cy.contains('button', 'Nuevo reporte').should('be.visible')
    })
  })

  it('groups the profile title and description in its page heading', () => {
    restoreTestAccount()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mi perfil').click()
    cy.get('.content .page-heading').within(() => {
      cy.get('h1').should('have.text', 'Mi perfil')
      cy.contains('p', 'Los datos con los que usas PerdiU.').should('be.visible')
    })
  })

  it('keeps a single level-one heading in the active page', () => {
    cy.get('.content h1').should('have.length', 1).and('have.text', 'Resumen')
  })

  it('keeps page headings horizontal at tablet width and stacks them on mobile', () => {
    cy.viewport(760, 900)
    cy.get('.page-heading').should('have.css', 'flex-direction', 'row')
    cy.get('.page-heading').should('have.css', 'margin-bottom', '24px')
    cy.viewport(390, 844)
    cy.get('.page-heading').should('have.css', 'flex-direction', 'column')
  })
})
