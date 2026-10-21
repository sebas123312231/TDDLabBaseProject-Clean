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
    cy.get('input[aria-label="Buscar reportes"]').type('mochila')
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
    cy.get('input[aria-label="Buscar reportes"]').type('mochila')
    cy.wait('@filteredCatalog')
    cy.contains('button', 'Limpiar').click()
    cy.get('input[aria-label="Buscar reportes"]').should('have.value', '')
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
    cy.get('input[aria-label="Buscar reportes"]').type('sin-coincidencias')
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
    cy.get('input[aria-label="Buscar reportes"]').type('limite')
    cy.get('@limitedCatalog.all').should('have.length', 6)
    cy.get('.hint[role="status"]')
      .should('contain', 'Se muestran hasta 50 resultados.')
      .and('contain', 'Ajusta los filtros para precisar la búsqueda.')
  })

  it('filters the catalog by report status with accessible tabs', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Explorar reportes').click()
    cy.intercept('GET', /\/api\/reports\?.*type=lost/).as('lostCatalog')
    cy.get('[role="tablist"][aria-label="Estado del reporte"]')
      .contains('[role="tab"]', 'Perdidos')
      .click()
    cy.get('[role="tablist"][aria-label="Estado del reporte"] [role="tab"][aria-selected="true"]')
      .should('contain', 'Perdidos')
    cy.wait('@lostCatalog').then(({ request }) => {
      expect(request.url).to.contain('type=lost')
    })
  })

  it('gives catalog search and selectors accessible names', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Explorar reportes').click()
    cy.get('input[aria-label="Buscar reportes"]')
      .should('have.attr', 'placeholder', 'Buscar por nombre o descripción')
      .and('have.attr', 'maxlength', '200')
    cy.get('select[aria-label="Ciudad"]').should('be.visible')
    cy.get('select[aria-label="Categoría"]').should('be.visible')
  })

  it('filters catalog results by city and category', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Explorar reportes').click()
    cy.intercept('GET', /\/api\/reports\?.*city=Cochabamba/).as('cityFilter')
    cy.get('select[aria-label="Ciudad"]').select('Cochabamba')
    cy.wait('@cityFilter').then(({ request }) => {
      expect(request.url).to.contain('city=Cochabamba')
    })
    cy.intercept('GET', /\/api\/reports\?.*category=object/).as('categoryFilter')
    cy.get('select[aria-label="Categoría"]').select('Objeto')
    cy.wait('@categoryFilter').then(({ request }) => {
      expect(request.url).to.contain('category=object')
    })
  })

  it('offers accessible status tabs on the illustrative map', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mapa').click()
    cy.get('[role="tablist"][aria-label="Estado del reporte"]').within(() => {
      cy.contains('[role="tab"]', 'Encontrados').click()
      cy.contains('[role="tab"][aria-selected="true"]', 'Encontrados').should('be.visible')
    })
    cy.get('input[aria-label="Buscar reportes"]').should('not.exist')
  })

  it('offers publication when map filters find no reports', () => {
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mapa').click()
    cy.get('select[aria-label="Ciudad"]').select('Santa Cruz')
    cy.get('select[aria-label="Categoría"]').select('Documentos')
    cy.get('.empty-state').within(() => {
      cy.contains('No hay reportes en esta zona').should('be.visible')
      cy.contains('Cambia los filtros o crea un reporte nuevo.').should('be.visible')
      cy.contains('button', 'Publicar reporte').click()
    })
    cy.get('input[type="email"]').should('be.visible')
  })

  it('shows a generic account avatar when the profile photo cannot load', () => {
    cy.intercept('GET', 'https://cdn.example.test/avatar.png', { statusCode: 404 }).as('avatar')
    restoreTestAccount()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mi perfil').click()
    cy.get('.profile-card .user-avatar').should('exist')
    cy.wait('@avatar')
    cy.get('.profile-card .user-avatar[aria-hidden="true"]').should('be.visible')
    cy.get('.profile-card img.user-avatar').should('not.exist')
  })

  it('opens the account menu and navigates to the profile', () => {
    cy.intercept('GET', 'https://cdn.example.test/avatar.png', { statusCode: 404 }).as('avatar')
    restoreTestAccount()
    cy.get('.header-account').click()
    cy.get('[role="menu"]').within(() => {
      cy.contains('persona@example.test').should('be.visible')
      cy.contains('[role="menuitem"]', 'Cerrar sesión').should('be.enabled')
      cy.contains('[role="menuitem"]', 'Mi perfil').click()
    })
    cy.get('.profile-card').should('be.visible')
  })

  it('explains that profile email is only visible to the account owner', () => {
    cy.intercept('GET', 'https://cdn.example.test/avatar.png', { statusCode: 404 }).as('avatar')
    restoreTestAccount()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mi perfil').click()
    cy.contains('.profile-card', 'Tu correo es privado: solo tú lo ves aquí.').should('be.visible')
  })

  it('navigates from the profile to the signed-in user reports', () => {
    cy.intercept('GET', 'https://cdn.example.test/avatar.png', { statusCode: 404 }).as('avatar')
    restoreTestAccount()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mi perfil').click()
    cy.get('.profile-link').click()
    cy.get('.app-header').should('contain', 'Mis reportes')
  })

  it('shows the account report and its resolve action', () => {
    cy.intercept('GET', 'https://cdn.example.test/avatar.png', { statusCode: 404 }).as('avatar')
    restoreTestAccount()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mis reportes').click()
    cy.contains('button', 'Milo, gato gris con collar azul').should('be.visible')
    cy.contains('button', 'Marcar resuelto').should('be.enabled')
  })

  it('filters own reports with accessible status tabs', () => {
    cy.intercept('GET', 'https://cdn.example.test/avatar.png', { statusCode: 404 }).as('avatar')
    restoreTestAccount()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mis reportes').click()
    cy.get('[role="tablist"][aria-label="Estado de mis reportes"]').within(() => {
      cy.contains('[role="tab"]', 'Resueltos').click()
      cy.contains('[role="tab"][aria-selected="true"]', 'Resueltos').should('be.visible')
    })
    cy.contains('button', 'Milo, gato gris con collar azul').should('not.exist')
  })

  it('offers publication when the selected own report filter is empty', () => {
    cy.intercept('GET', 'https://cdn.example.test/avatar.png', { statusCode: 404 }).as('avatar')
    restoreTestAccount()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mis reportes').click()
    cy.get('[role="tablist"][aria-label="Estado de mis reportes"]')
      .contains('[role="tab"]', 'Resueltos')
      .click()
    cy.get('.empty-state').within(() => {
      cy.contains('Todavía no tienes reportes resueltos').should('be.visible')
      cy.contains('Cuando publiques algo, podrás seguirlo y gestionarlo desde aquí.').should('be.visible')
      cy.contains('button', 'Publicar mi primer reporte').click()
    })
    cy.get('.publish-form').should('be.visible')
  })

  it('opens publication from the own reports heading action', () => {
    cy.intercept('GET', 'https://cdn.example.test/avatar.png', { statusCode: 404 }).as('avatar')
    restoreTestAccount()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mis reportes').click()
    cy.contains('button', 'Nuevo reporte').click()
    cy.get('.publish-form').should('be.visible')
  })

  it('hides the resolve action after resolving an own report', () => {
    cy.intercept('GET', 'https://cdn.example.test/avatar.png', { statusCode: 404 }).as('avatar')
    restoreTestAccount()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mis reportes').click()
    cy.contains('button', 'Marcar resuelto').click()
    cy.get('.report-grid').should('contain', 'Resuelto')
    cy.contains('button', 'Marcar resuelto').should('not.exist')
  })

  it('removes an own report through its accessible delete action', () => {
    cy.intercept('GET', 'https://cdn.example.test/avatar.png', { statusCode: 404 }).as('avatar')
    restoreTestAccount()
    cy.contains('nav[aria-label="Navegación del panel"] button', 'Mis reportes').click()
    cy.get('button[aria-label="Eliminar reporte"]')
      .should('have.class', 'danger')
      .and('contain.text', 'Eliminar')
      .click()
    cy.get('.empty-state').should('contain', 'Aún no publicaste reportes')
    cy.contains('button', 'Publicar mi primer reporte').should('be.visible')
  })
})
