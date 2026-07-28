import { Page } from '@playwright/test'
import { boxedStep } from '@/utils/decorators/boxedStep'
import { LoginPage } from '@/utils/fixtures/pageObjects/loginPage'
import { bipiUser } from '@/utils/constants'
import { CampInfo } from '@/utils/fixtures/pageObjects/camp/admin/campInfo'
import { CampCategories } from '@/utils/fixtures/pageObjects/camp/admin/campCategories'

type CampPrototype = 'empty' | string

export type CampFixtureType = {
  createCamp: (prototype: CampPrototype) => Promise<Camp>
}

export const campFixture = {
  createCamp: async (
    { page, runId }: { page: Page; runId: string },
    use: (a: CampFixtureType['createCamp']) => Promise<void>
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
    const campTitle = `camp ${this._runId}`

    const loginPage = await new LoginPage(this._page).open()
    const campListPage = await loginPage.loginToCampList(user)
    const createCampDialogStep1 = await campListPage.openCreateCampDialog()
    await createCampDialogStep1.fillForm(tomorrow, in2Days, campTitle)

    const createCampDialogStep2 = await createCampDialogStep1.next()
    const campInfo = await createCampDialogStep2
      .selectPrototype('Keine Vorlage')
      .then((value) => value.submit())

    const url = new URL(this._page.url())
    const campIdMatch = url.pathname.match(/\/camps\/([^/]+)\//)
    const campId = campIdMatch ? campIdMatch[1] : ''

    return new Camp(this._page, campId, campTitle, campInfo)
  }
}

export class Camp {
  constructor(
    private readonly _page: Page,
    private readonly _campId: string,
    private readonly _campTitle: string,
    private readonly _campInfo: CampInfo
  ) {}

  get campId(): string {
    return this._campId
  }

  get campTitle(): string {
    return this._campTitle
  }

  get campInfo(): CampInfo {
    return this._campInfo
  }

  @boxedStep
  async gotoCategories() {
    await this._page.goto(`/camps/${this._campId}/admin/activity`)
    const campCategories = new CampCategories(this._page)
    await campCategories.loaded()
    return campCategories
  }
}
