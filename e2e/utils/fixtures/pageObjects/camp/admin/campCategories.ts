import { expect, Page } from '@playwright/test'
import { boxedStep } from '@/utils/decorators/boxedStep'
import { DialogCategoryCreate } from '@/utils/fixtures/pageObjects/camp/admin/dialogCategoryCreate'

export class CampCategories {
  constructor(
    private readonly _page: Page,
    private readonly _createCategoryButton = _page.getByRole('button', {
      name: /Block-Kategorie erstellen/i,
    })
  ) {}

  @boxedStep
  async loaded() {
    await expect(this._createCategoryButton).toBeVisible({ timeout: 20000 })
    return this
  }

  @boxedStep
  async openCreateCategoryDialog() {
    await this._createCategoryButton.click()
    const dialog = new DialogCategoryCreate(this._page)
    await dialog.loaded()
    return dialog
  }

  @boxedStep
  async expectCategoryVisible(categoryName: string) {
    await expect(this._page.getByText(categoryName).first()).toBeVisible({
      timeout: 30000,
    })
    return this
  }
}
