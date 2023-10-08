// https://docs.cypress.io/api/introduction/api.html

const { verify } = require('crypto')
const path = require('path')

describe('HTTP cache tests', () => {
  it('caches /content_types separately for each login', () => {
    const uri = '/content_types'

    Cypress.session.clearAllSavedSessions()
    cy.login('test@example.com')

    // first request is a cache miss
    cy.request(Cypress.env('API_ROOT_URL_CACHED') + '/api/content_types.jsonhal').then(
      (response) => {
        const headers = response.headers
        expect(headers.xkey).to.eq(
          'f17470519474 1a0f84e322c8 3ef17bd1df72 4f0c657fecef 44dcc7493c65 cfccaecd4bad 318e064ea0c9 /api/content_types'
        )
        expect(headers['x-cache']).to.eq('MISS')
      }
    )

    // second request is a cache hit
    cy.expectCacheHit(uri)

    // request with a new user is a cache miss
    cy.login('castor@example.com')
    cy.expectCacheMiss(uri)
  })

  it('caches /camp/{campId}/categories separately for each login', () => {
    const uri = '/api/camps/3c79b99ab424/categories'

    Cypress.session.clearAllSavedSessions()
    cy.login('test@example.com')

    // first request is a cache miss
    cy.request(Cypress.env('API_ROOT_URL_CACHED') + uri + '.jsonhal').then((response) => {
      const headers = response.headers
      expect(headers.xkey).to.eq(
        'ebfd46a1c181 ebfd46a1c181#camp ebfd46a1c181#preferredContentTypes 9d7b3a220fb4 9d7b3a220fb4#root 9d7b3a220fb4#parent 9d7b3a220fb4#children 9d7b3a220fb4#contentType ebfd46a1c181#rootContentNode ebfd46a1c181#contentNodes ' +
          '1a869b162875 1a869b162875#camp 1a869b162875#preferredContentTypes be9b6b7f23f6 be9b6b7f23f6#root be9b6b7f23f6#parent be9b6b7f23f6#children be9b6b7f23f6#contentType 1a869b162875#rootContentNode 1a869b162875#contentNodes ' +
          'dfa531302823 dfa531302823#camp dfa531302823#preferredContentTypes 63cbc734fa04 63cbc734fa04#root 63cbc734fa04#parent 63cbc734fa04#children 63cbc734fa04#contentType dfa531302823#rootContentNode dfa531302823#contentNodes ' +
          'a023e85227ac a023e85227ac#camp a023e85227ac#preferredContentTypes 2cce9e17a368 2cce9e17a368#root 2cce9e17a368#parent 2cce9e17a368#children 2cce9e17a368#contentType a023e85227ac#rootContentNode a023e85227ac#contentNodes ' +
          '/api/camps/3c79b99ab424/categories'
      )
      expect(headers['x-cache']).to.eq('MISS')
    })

    // second request is a cache hit
    cy.expectCacheHit(uri)

    // request with a new user is a cache miss
    cy.login('castor@example.com')
    cy.expectCacheMiss(uri)
  })

  it('invalidates /camp/{campId}/categories for all users on category patch', () => {
    const uri = '/api/camps/3c79b99ab424/categories'

    // bring data into defined state
    Cypress.session.clearAllSavedSessions()
    cy.login('castor@example.com')
    cy.apiPatch('/api/categories/ebfd46a1c181', {
      name: 'old_name',
    })

    // warm up cache
    cy.expectCacheMiss(uri)
    cy.expectCacheHit(uri)

    cy.login('test@example.com')
    cy.expectCacheMiss(uri)
    cy.expectCacheHit(uri)

    // touch category
    cy.apiPatch('/api/categories/ebfd46a1c181', {
      name: 'new_name',
    })

    // ensure cache was invalidated
    cy.expectCacheMiss(uri)
    cy.login('castor@example.com')
    cy.expectCacheMiss(uri)
  })

  it('invalidates /camp/{campId}/categories for new contentNode child', () => {
    const uri = '/api/camps/3c79b99ab424/categories'

    Cypress.session.clearAllSavedSessions()
    cy.login('test@example.com')

    // warm up cache
    cy.expectCacheMiss(uri)
    cy.expectCacheHit(uri)

    // add new child to root content node (9d7b3a220fb4) of category (ebfd46a1c181)
    cy.apiPost('/api/content_node/column_layouts', {
      parent: '/api/content_node/column_layouts/9d7b3a220fb4',
      slot: '1',
      contentType: '/api/content_types/f17470519474',
    }).then((response) => {
      const newContentNodeUri = response.body._links.self.href

      console.log(response)
      console.log(newContentNodeUri)

      // ensure cache was invalidated
      cy.expectCacheMiss(uri)
      cy.expectCacheHit(uri)

      // delete newly created contentNode
      cy.apiDelete(newContentNodeUri)

      // ensure cache was invalidated
      cy.expectCacheMiss(uri)
    })
  })

  const getIframeDocument = () => {
    return (
      cy
        .get('iframe.panel-html')
        // Cypress yields jQuery element, which has the real
        // DOM element under property "0".
        // From the real DOM iframe element we can get
        // the "document" element, it is stored in "contentDocument" property
        // Cypress "its" command can access deep properties using dot notation
        // https://on.cypress.io/its
        .its('0.contentDocument')
        .should('exist')
    )
  }

  const getIframeBody = () => {
    // get the document
    return (
      getIframeDocument()
        // automatically retries until body is loaded
        .its('body')
        .should('not.be.undefined')
        // wraps "body" DOM element to allow
        // chaining more Cypress commands, like ".find(...)"
        .then(cy.wrap)
    )
  }

  it.only('invalidates cached data when user leaves a camp', () => {
    Cypress.session.clearAllSavedSessions()
    const uri = '/api/camps/3c79b99ab424/categories'

    // warm up cache
    cy.login('castor@example.com')
    cy.expectCacheMiss(uri)
    cy.expectCacheHit(uri)

    // deactivate Castor
    cy.login('test@example.com')
    cy.visit('/camps/3c79b99ab424/GRGR/admin/collaborators')
    cy.get('.v-list-item__title:contains("Castor")').click()
    cy.get('button:contains("Deaktivieren")').click()
    cy.get('div[role=alert]').find('button').contains('Deaktivieren').click()

    // ensure cache was invalidated
    cy.login('castor@example.com')
    cy.expectCacheMiss(uri)

    // delete old emails
    cy.visit('localhost:3000/mail')
    cy.get('a[title="Delete all emails"]').click()
    cy.wait(50)
    cy.get('a[title="Delete all emails"]').click()

    // invite Castor
    cy.login('test@example.com')
    cy.visit('/camps/3c79b99ab424/GRGR/admin/collaborators')
    cy.get('.v-list-item__title:contains("Castor")').click()
    cy.get('button:contains("Erneut einladen")').click()
    cy.wait(100)

    // accept invitation as Castor
    cy.login('castor@example.com')
    cy.visit('localhost:3000/mail')
    cy.get('a').contains('[eCamp3] Du wurdest ins Lager "Pfila 2023" eingeladen').click()
    cy.wait(400)
    getIframeBody()
      .find('a')
      .then(($a) => {
        const href = $a.prop('href')
        cy.visit(href)
        cy.get('button').contains('Einladung mit aktuellem Account akzeptieren').click()
        cy.visit('/camps')
        cy.contains('GRGR')
      })
  })
})
