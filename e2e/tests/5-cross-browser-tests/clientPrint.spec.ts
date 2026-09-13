// ClientPrint

import { test, expect } from '@playwright/test'
import { getPdfProperties } from '@/utils/getPdfProperties'
import { loginAndSetCookie } from '@/utils/helpers'

import { readFileSync } from 'fs'

test.describe('Client print test', { tag: '@mature' }, () => {
  test.beforeEach(async ({ page, request }) => {
    await loginAndSetCookie(page, request, 'test@example.com')
  })

  test('downloads PDF', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL((url) => url.pathname === '/camps')

    const campLink = page.getByRole('link', { name: 'GRGR' })
    await expect(campLink).toBeVisible()
    await campLink.click()

    const adminLink = page.getByRole('link', { name: 'Admin' })
    await expect(adminLink).toBeVisible()
    await adminLink.click()

    const printLink = page.getByRole('link', { name: 'Drucken' })
    await expect(printLink).toBeVisible()
    await printLink.click()

    const downloadButton = page.getByRole('button', {
      name: 'PDF herunterladen (Layout #2)',
    })
    await expect(downloadButton).toBeVisible()
    await expect(downloadButton).toBeEnabled()
    const downloadPromise = page.waitForEvent('download')
    await downloadButton.click()
    const download = await downloadPromise

    const path = await download.path()
    const buffer = readFileSync(path)
    const pdfProps = await getPdfProperties(buffer)

    expect(download.suggestedFilename()).toBe('Pfila-2023.pdf')
    expect(pdfProps.numPages).toBe(20)
  })
})
