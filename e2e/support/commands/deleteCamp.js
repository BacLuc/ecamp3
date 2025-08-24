Cypress.Commands.add('deleteCamp', (campTitle) => {
  cy.url().then((url) => {
    if (!url.match(/\/camps\/.*\/.*\/admin\/info$/)) {
      Cypress.log({
        name: 'deleteCamp',
        message: `Skipping camp deletion: current URL "${url}" does not match expected pattern "/camps/.*/.*/admin/info"`,
        consoleProps: () => ({ url }),
      })
      return
    }
    cy.contains('Gefahrenzone').click()
    cy.contains('Lager löschen').should('be.visible')
    cy.get('[data-testid="delete-camp-button"]').click()

    cy.contains('Wirklich löschen?').should('be.visible')

    const deleteButtonSelector = 'button:contains("Löschen")'
    const confirmFormSelector = `form:has(:contains("Wirklich löschen?")):has(${deleteButtonSelector})`
    cy.get(confirmFormSelector).should('be.visible')
    cy.get(
      `${confirmFormSelector} input[data-testid="delete-camp-confirm-textinput"]`
    ).type(campTitle)
    cy.get(`${confirmFormSelector} ${deleteButtonSelector}`).should('be.enabled').click()

    cy.url().should('match', /\/camps$/)
    cy.contains('GRGR').should('exist')
    cy.contains('Auf in die Berge').should('exist')
    cy.contains(campTitle).should('not.exist')
  })
})
