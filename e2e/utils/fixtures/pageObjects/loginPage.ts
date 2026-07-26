import { expect, Locator, Page } from '@playwright/test'
import { boxedStep } from '@/utils/decorators/boxedStep'
import { CampListPage } from '@/utils/fixtures/pageObjects/campListPage'

export const loginPageFixture = {
  loginPage: async (
    { page }: { page: Page },
    use: (loginPage: LoginPage) => Promise<void>
  ) => {
    await use(new LoginPage(page))
  },
}

export type LoginPageFixtureType = {
  loginPage: LoginPage
}

export class LoginPage {
  private readonly _page: Page
  private readonly _quickLoginButton: Locator
  private readonly _emailField: Locator
  private readonly _passwordField: Locator
  private readonly _loginButton: Locator
  constructor(page: Page) {
    this._page = page
    this._quickLoginButton = page.locator('[role="alert"] button:has-text("Login")')

    const formLocator = page.locator('form')
    this._emailField = formLocator.locator('input[name="email"]')
    this._passwordField = formLocator.locator('input[name="password"]')
    this._loginButton = formLocator.locator('button[type="submit"]')
  }

  @boxedStep
  async open() {
    await this._page.goto('/login')
    return this.loaded()
  }

  @boxedStep
  async loaded() {
    await expect(this._quickLoginButton).toBeVisible()
    await expect(this._emailField).toBeVisible()
    await expect(this._passwordField).toBeVisible()
    await expect(this._loginButton).toBeVisible()

    return this
  }

  @boxedStep
  async loginToCampList(user: string, password: string = 'test') {
    await this.loaded()
    await this._emailField.fill(user)
    await this._passwordField.fill(password)
    await this._loginButton.click()
    const campListPage = new CampListPage(this._page)
    await campListPage.loaded()
    return campListPage
  }

  get locator(): Locator {
    return this._page.locator('body')
  }

  get emailField(): Locator {
    return this._emailField
  }

  get passwordField(): Locator {
    return this._passwordField
  }
}
