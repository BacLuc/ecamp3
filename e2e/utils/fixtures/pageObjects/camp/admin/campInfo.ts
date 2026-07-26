import { expect, Locator, Page } from '@playwright/test'

export class CampInfo {
  constructor(
    private readonly _page: Page,
    private readonly _titleField = _page.locator('[data-testid="title"] input')
  ) {}

  async loaded() {
    await expect(this._titleField).toBeVisible()
  }

  get titleField(): Locator {
    return this._titleField
  }
}
