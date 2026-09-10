import { expect } from '@playwright/test'
import { bipiUser } from '@/utils/constants'
import { loginAndSetCookie, createCampViaUI, deleteCampViaUI } from '@/utils/helpers'
import { test } from '@/utils/etest'

const campTitle = 'CatTestCamp'

test.describe('category on new camp', () => {
  test.describe.configure({ mode: 'serial' })

  let campAdminBaseUrl: string

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await loginAndSetCookie(page, null, bipiUser)
    campAdminBaseUrl = await createCampViaUI(page, campTitle)
    await context.close()
  })

  test.afterAll(async ({ browser }) => {
    if (!campAdminBaseUrl) return
    const context = await browser.newContext()
    const page = await context.newPage()
    await loginAndSetCookie(page, null, bipiUser)
    await deleteCampViaUI(page, campAdminBaseUrl, campTitle)
    await context.close()
  })

  test('creates a new category on the camp', async ({ page, request, runId }) => {
    const categoryName = `Test Category ${runId}`
    await loginAndSetCookie(page, request, bipiUser)

    await page.goto(`${campAdminBaseUrl}/activity`)

    const createButton = page.getByRole('button', { name: /Block-Kategorie erstellen/i })
    await expect(createButton).toBeVisible({ timeout: 15000 })
    await createButton.click()

    const dialog = page.locator('.v-overlay--active')
    await expect(dialog).toBeVisible({ timeout: 10000 })

    await dialog.locator('[name="short"] input').fill('TC')
    await dialog.locator('[name="name"] input').fill(categoryName)

    await dialog.getByRole('button', { name: /Erstellen/i }).click()

    await expect(dialog).toBeHidden({ timeout: 10000 })
    await page.goto(`${campAdminBaseUrl}/activity`)
    await expect(createButton).toBeVisible({ timeout: 15000 })

    const categoryItem = page
      .locator('.ec-content-group')
      .filter({
        has: page.getByRole('heading', { name: 'Block-Kategorien', exact: true }),
      })
      .locator('.v-list-item')
      .filter({
        hasText: new RegExp(
          `(?<!\\w)${categoryName.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}(?!\\w)`
        ),
      })
    await expect(categoryItem).toHaveCount(1)
    await expect(categoryItem).toBeVisible({
      timeout: 10000,
    })

    await page.goto(`${campAdminBaseUrl}/activity`)
    await expect(categoryItem).toHaveCount(1)
    await expect(categoryItem).toBeVisible()
  })
})
