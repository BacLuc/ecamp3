import { bipiUser } from './constants'

const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)

const in2Days = new Date()
in2Days.setDate(in2Days.getDate() + 2)

const campTitle = `title_${new Date().getTime()}`
describe('create new camp', () => {
  afterEach(() => {
    cy.deleteCamp(campTitle)
  })

  it('without prototype', () => {
    cy.login(bipiUser)

    cy.visit('/camps')

    cy.get('[data-testid="create-camp-button"]').click()

    cy.get('[data-testid="create-camp-title-input"] input').type(campTitle)
    cy.get('[data-testid="create-camp-organizer"] input').type('org')
    cy.get('[data-testid="create-camp-motto"] input').type('motto')
    cy.get('[data-testid="start-date-picker"] input').type(
      tomorrow.toLocaleDateString('de-CH')
    )
    cy.get('[data-testid="end-date-picker"] input').type(
      in2Days.toLocaleDateString('de-CH')
    )

    cy.get('[data-testid="create-camp-next-step"]').click()
    cy.get('.v-select__selections > [data-testid="prototype-select"]').click()
    cy.contains('Keine Vorlage').click()
    cy.contains('Achtung: Du hast "Keine Vorlage" ausgewählt.').should('be.visible')
    cy.get('[data-testid="create-camp-button"]').click()

    cy.contains('Lagerinfos').should('be.visible')
    cy.get('[data-testid="title"] input').should('have.value', campTitle)
  })
})
