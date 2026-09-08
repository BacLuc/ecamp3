import { test, expect } from '@playwright/test'
import { loginAndSetCookie } from '@/utils/helpers'

test('forced race: delayed second scroll', async ({ page, request }) => {
  // After the first scroll (Playwright's scroll-into-view), fire a second
  // scroll 20-100ms later. If it lands between Playwright's stability check
  // and the mouse dispatch, VMenu's reposition strategy moves the menu and
  // the click hits the app bar instead of the item.
  await page.addInitScript(() => {
    let fired = false
    window.addEventListener(
      'scroll',
      () => {
        if (fired) return
        fired = true
        setTimeout(() => window.scrollBy(0, 120), 20 + Math.random() * 80)
      },
      { passive: true }
    )
  })

  await loginAndSetCookie(page, request, 'test@example.com')
  await page.goto('/camps')
  await page.getByRole('link', { name: 'GRGR' }).click()
  await expect(page.getByRole('link', { name: 'Hauptlager' })).toBeVisible()

  await page.locator('span.v-chip:has-text("Kategorie")').click()
  await clickOnItemWithLabel(page, 'Essen')
  await clickOnItemWithLabel(page, 'Lagersport')

  await expect(
    page.locator('span.v-chip:has-text("Kategorie: ES oder LS")')
  ).toBeVisible()
})

// Copy of the helper under test — swap between unfixed and fixed versions.
async function clickOnItemWithLabel(
  page: import('@playwright/test').Page,
  label: string
) {
  await page
    .getByRole('listitem')
    .filter({ has: page.getByText(label, { exact: true }) })
    .click()
}
