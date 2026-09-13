import { test, expect, type Page } from '@playwright/test'
import { loginAndSetCookie } from '@/utils/helpers'

test.describe('The filters in the dashboard', { tag: '@mature' }, () => {
  test.beforeEach(async ({ page, request }) => {
    await loginAndSetCookie(page, request, 'test@example.com')
    await page.goto('/camps')
    await page.getByRole('link', { name: 'GRGR' }).click()
    await expect(page.getByRole('link', { name: 'Hauptlager' })).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    /**
     * Firefox does not like it if a test is finished while
     * requests are still running. Thus, we wait for this text to be rendered.
     * This worked better than intercepting requests.
     */
    await expect(page.locator('body')).toContainText('Hauptlager')
  })

  test('can be shared via url', async ({ page }) => {
    await page.locator('span.v-chip:has-text("Kategorie")').click()
    await clickOnItemWithLabel(page, 'Essen')
    await clickOnItemWithLabel(page, 'Lagersport')

    await expect(
      page.locator('span.v-chip:has-text("Kategorie: ES oder LS")')
    ).toBeVisible()

    await page.locator('span.v-chip:has-text("Status")').click()
    await clickOnItemWithLabel(page, 'Geplant')
    await clickOnItemWithLabel(page, 'Coach OK')

    await expect(
      page.locator('span.v-chip:has-text("Status: Geplant oder Coach OK")')
    ).toBeVisible()

    await page.reload()

    await expect(
      page.locator('span.v-chip:has-text("Kategorie: ES oder LS")')
    ).toBeVisible()
    await expect(
      page.locator('span.v-chip:has-text("Status: Geplant oder Coach OK")')
    ).toBeVisible()
  })

  test('are removed from the url when removed in the gui', async ({ page }) => {
    await page.locator('span.v-chip:has-text("Kategorie")').click()
    await clickOnItemWithLabel(page, 'Essen')
    await clickOnItemWithLabel(page, 'Lagersport')

    await expect(
      page.locator('span.v-chip:has-text("Kategorie: ES oder LS")')
    ).toBeVisible()

    await page.reload()

    await expect(
      page.locator('span.v-chip:has-text("Kategorie: ES oder LS")')
    ).toBeVisible()

    await page.locator('span.v-chip:has-text("Kategorie: ES oder LS")').click()

    await clickOnItemWithLabel(page, 'Essen')
    await clickOnItemWithLabel(page, 'Lagersport')

    await expect(
      page.locator('span.v-chip:has-text("Kategorie: ES oder LS")')
    ).toBeHidden()
    await expect(page.locator('span.v-chip:has-text("Kategorie")')).toBeVisible()

    await page.reload()

    await expect(
      page.locator('span.v-chip:has-text("Kategorie: ES oder LS")')
    ).toBeHidden()
    await expect(page.locator('span.v-chip:has-text("Kategorie")')).toBeVisible()
  })

  test('support selecting activities without responsibles', async ({ page }) => {
    await page.locator('span.v-chip:has-text("Verantwortlich")').click()
    await clickOnItemWithLabel(page, 'Keine Verantwortlichen')

    await expect(
      page.locator('span.v-chip:has-text("Verantwortlich: Keine Verantwortlichen")')
    ).toBeVisible()

    await page.reload()

    await expect(
      page.locator('span.v-chip:has-text("Verantwortlich: Keine Verantwortlichen")')
    ).toBeVisible()
  })
})

async function clickOnItemWithLabel(page: Page, label: string) {
  const item = page
    .getByRole('listitem')
    .filter({ has: page.getByText(label, { exact: true }) })

  // Wait for the menu containing this item to finish its opening transition:
  // VMenu's VDialogTransition keeps pointer-events:none on .v-overlay__content
  // until the enter animation completes.
  const overlay = item.locator(
    'xpath=ancestor::*[contains(@class, "v-overlay__content")]'
  )
  await expect(overlay).toHaveCSS('pointer-events', 'auto')

  // Scroll the item into view *before* the click so the click itself does not
  // trigger a scroll. A scroll during the click makes VMenu's reposition
  // strategy move the menu (rAF-deferred), so the click can dispatch from a
  // stale bounding box and land in the app bar.
  await item.scrollIntoViewIfNeeded()

  // Wait for the menu to stop moving (scroll reposition settles).
  let prev = ''
  for (let i = 0; i < 20; i++) {
    const box = await item.boundingBox()
    const key = box ? `${Math.round(box.x)},${Math.round(box.y)}` : ''
    if (key && key === prev) break
    prev = key
    await page.waitForTimeout(50)
  }

  await item.click()
}
