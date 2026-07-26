import { expect, Locator, Page } from '@playwright/test'
import { boxedStep } from '@/utils/decorators/boxedStep'
import { LoginPage } from '@/utils/fixtures/pageObjects/loginPage'
import { bipiUser } from '@/utils/constants'

type CampPrototype = 'empty' | string

export type CampFixtureType = {
  create: (prototype: CampPrototype) => Promise<Camp>
}

export const campFixture = {
  create: async (
    { page, runId }: { page: Page; runId: string },
    use: (a: CampFixtureType['create']) => Promise<void>
  ) => {
    await use((prototype) => new CreateCamp(page, prototype, runId).create())
  },
}

class CreateCamp {
  private readonly _page: Page
  private readonly _campPrototype: CampPrototype
  private readonly _runId: string

  constructor(page: Page, campPrototype: CampPrototype, runId: string) {
    this._page = page
    this._campPrototype = campPrototype
    this._runId = runId
  }

  @boxedStep
  async create(user = bipiUser) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const in2Days = new Date()
    in2Days.setDate(in2Days.getDate() + 2)

    const campListPage = await new LoginPage(this._page).loginToCampList(bipiUser)
    await campListPage.createCampButton.click()

    return new Camp(this._page)
  }
}

export class Camp {
  private readonly _page: Page
  private readonly _campId: string
  constructor(page: Page, campId: string) {
    this._page = page
    this._campId = campId
  }
}
