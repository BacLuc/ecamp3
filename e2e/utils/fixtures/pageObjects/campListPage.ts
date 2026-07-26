import { expect, Locator, Page } from '@playwright/test'
import { boxedStep } from '@/utils/decorators/boxedStep'
import { CreateCampDialogStep1 } from '@/utils/fixtures/pageObjects/createCamp/createCampDialogStep1'

export type CampListPageFixtureType = {
  loginPage: CampListPage
}

export const camplistPageFixture = {
  camplistPage: async (
    { page }: { page: Page },
    use: (a: CampListPageFixtureType['loginPage']) => Promise<void>
  ) => {
    await use(new CampListPage(page))
  },
}

export class CampListPage {
  private readonly _page: Page
  private readonly _createCampButton: Locator

  constructor(page: Page) {
    this._page = page
    this._createCampButton = page.getByTestId('create-camp-button')
  }

  @boxedStep
  async loaded() {
    await expect(this._createCampButton).toBeVisible()
    return this
  }

  @boxedStep
  async openCreateCampDialog() {
    await this._createCampButton.click()
    return new CreateCampDialogStep1(this._page)
  }
}
