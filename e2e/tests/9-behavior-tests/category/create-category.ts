import { expect } from '@playwright/test'
import { test } from '@/utils/etest'
import { CampCategories } from '@/utils/fixtures/pageObjects/camp/admin/campCategories'

test.describe('category on new camp', () => {
  test('creates a new category on the camp', async ({ createCamp, runId, page }) => {
    const categoryName = `Test Category ${runId}`
    const camp = await createCamp('Keine Vorlage')

    const campCategories = await camp.gotoCategories()
    const dialog = await campCategories.openCreateCategoryDialog()
    await dialog.fillForm('TC', categoryName)
    await dialog.submit()

    // App navigates to category detail page after creation - verify name is visible
    await expect(page.getByText(categoryName).first()).toBeVisible({
      timeout: 15000,
    })

    // Navigate back to categories list to verify it appears there too
    await page.goto(`/camps/${camp.campId}/admin/activity`)
    const categoriesAfterCreate = await new CampCategories(page).loaded()
    await categoriesAfterCreate.expectCategoryVisible(categoryName)

    // Revisit the page to verify persistence
    await page.goto(`/camps/${camp.campId}/admin/activity`)
    const reloadedCategories = await new CampCategories(page).loaded()
    await reloadedCategories.expectCategoryVisible(categoryName)
  })
})
