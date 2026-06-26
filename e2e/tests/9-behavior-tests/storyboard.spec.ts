import { test, expect, type APIRequestContext } from '@playwright/test'
import { bipiUser, basiskursCampId } from '@/utils/constants'
import { getAuthContext, loginAndSetCookie, API_ROOT_URL } from '@/utils/helpers'

// Origin without the `/api` suffix, used to resolve HAL `self` links.
const ORIGIN = API_ROOT_URL.replace(/\/api$/, '')
const HAL = { headers: { Accept: 'application/hal+json' } }
const SCREENSHOT_DIR = 'screenshots'
const EMPTY_SECTION_ID = '11111111-1111-4111-8111-111111111111'

function campIri(campId: string) {
  return encodeURIComponent(`/api/camps/${campId}`)
}

type Section = {
  column1: string
  column2Html: string
  column3: string
  position: number
}
type StoryboardData = { sections: Record<string, Section> } & Record<string, unknown>

// Locate an editable storyboard in the basiskurs camp (bipiUser is manager) and
// the activity / schedule entry that own it, so we can open the edit page.
async function findStoryboard(api: APIRequestContext) {
  const storyboards = await (
    await api.get(
      `${API_ROOT_URL}/content_node/storyboards?camp=${campIri(basiskursCampId)}`,
      HAL
    )
  ).json()
  const storyboard = storyboards._embedded.items[0]

  const activities = await (
    await api.get(`${API_ROOT_URL}/activities?camp=${campIri(basiskursCampId)}`, HAL)
  ).json()
  const activity = activities._embedded.items.find(
    (a: { _links: { rootContentNode?: { href: string } } }) =>
      a._links.rootContentNode?.href === storyboard._links.root.href
  )

  const scheduleEntries = await (
    await api.get(
      `${API_ROOT_URL}/schedule_entries?activity=${encodeURIComponent(`/api/activities/${activity.id}`)}`,
      HAL
    )
  ).json()

  return {
    uri: storyboard._links.self.href as string,
    data: storyboard.data as StoryboardData,
    editUrl: `/camps/${basiskursCampId}/x/program/activity/${activity.id}/${scheduleEntries._embedded.items[0].id}/x`,
  }
}

async function getStoryboardData(api: APIRequestContext, uri: string) {
  return (await (await api.get(`${ORIGIN}${uri}`, HAL)).json()).data as StoryboardData
}

// Build the edit URL of an activity identified by its exact title in a camp.
async function findActivityEditUrl(
  api: APIRequestContext,
  campId: string,
  title: string
) {
  const activities = await (
    await api.get(`${API_ROOT_URL}/activities?camp=${campIri(campId)}`, HAL)
  ).json()
  const activity = activities._embedded.items.find(
    (a: { title: string }) => a.title === title
  )
  const scheduleEntries = await (
    await api.get(
      `${API_ROOT_URL}/schedule_entries?activity=${encodeURIComponent(`/api/activities/${activity.id}`)}`,
      HAL
    )
  ).json()
  return `/camps/${campId}/x/program/activity/${activity.id}/${scheduleEntries._embedded.items[0].id}/x`
}

async function patchStoryboardData(
  api: APIRequestContext,
  uri: string,
  data: Record<string, unknown>
) {
  await api.patch(`${ORIGIN}${uri}`, {
    headers: { 'Content-Type': 'application/merge-patch+json' },
    data: { data },
  })
}

// Reset the storyboard to a single empty section so the test starts from a
// known state regardless of any existing content.
async function resetToSingleSection(api: APIRequestContext, uri: string) {
  const current = await getStoryboardData(api, uri)
  const sections: Record<string, Section | null> = {}
  Object.keys(current.sections).forEach((key) => {
    sections[key] = null
  })
  sections[EMPTY_SECTION_ID] = {
    column1: '',
    column2Html: '',
    column3: '',
    position: 0,
  }
  await patchStoryboardData(api, uri, { sections })
}

test.describe('storyboard continuous editor', () => {
  test.describe.configure({ mode: 'serial' })

  let api: APIRequestContext
  let storyboardUri: string
  let editUrl: string
  let originalData: StoryboardData

  test.beforeAll(async () => {
    api = await getAuthContext(bipiUser)
    const found = await findStoryboard(api)
    storyboardUri = found.uri
    editUrl = found.editUrl
    originalData = found.data
    await resetToSingleSection(api, storyboardUri)
  })

  test.afterAll(async () => {
    // Restore the storyboard to its original state so the seed data is not
    // permanently mutated: re-send the original sections and null out any
    // sections the test added.
    const current = await getStoryboardData(api, storyboardUri)
    const sections: Record<string, Section | null> = { ...originalData.sections }
    Object.keys(current.sections).forEach((key) => {
      if (!(key in originalData.sections)) {
        sections[key] = null
      }
    })
    await patchStoryboardData(api, storyboardUri, { ...originalData, sections })
    await api.dispose()
  })

  test('derives sections from times in continuous text', async ({ page }) => {
    await loginAndSetCookie(page, null, bipiUser)
    await page.goto(editUrl)

    const editor = page.locator('.e-storyboard-continuous')
    await expect(editor).toBeVisible()

    // The editor starts as a single empty paragraph with a left time gutter,
    // and there is no "add section" button: sections come from times.
    await expect(page.locator('.e-sb-para--top')).toHaveCount(1)
    const timeInputs = page.locator('.e-sb-para__time-input')

    await page
      .locator('.e-sb-para--top')
      .first()
      .screenshot({
        path: `${SCREENSHOT_DIR}/storyboard-section-empty.png`,
      })

    // A time entered in the gutter is normalized on blur and starts a section.
    await timeInputs.first().fill('9')
    await timeInputs.first().blur()
    await expect(timeInputs.first()).toHaveValue('09:00')

    // Write continuous text: two paragraphs that belong to the 09:00 section.
    await page.locator('.e-sb-para__text').first().click()
    await page.keyboard.type('Arrival and welcome')

    await page
      .locator('.e-sb-para--top')
      .first()
      .screenshot({
        path: `${SCREENSHOT_DIR}/storyboard-section-filled.png`,
      })

    await page.keyboard.press('Enter')
    await page.keyboard.type('Still part of the morning')

    // A third paragraph with its own time starts a second section.
    await page.keyboard.press('Enter')
    await page.keyboard.type('Lunch break')
    await expect(page.locator('.e-sb-para--top')).toHaveCount(3)
    await timeInputs.nth(2).fill('12')
    await timeInputs.nth(2).blur()
    await expect(timeInputs.nth(2)).toHaveValue('12:00')

    await editor.screenshot({
      path: `${SCREENSHOT_DIR}/storyboard-continuous-editor.png`,
    })

    // The component figured out which paragraphs belong to which time and
    // serialized two sections into the API `sections` structure (debounced).
    await expect
      .poll(
        async () => {
          const data = await getStoryboardData(api, storyboardUri)
          return Object.values(data.sections)
            .sort((a, b) => a.position - b.position)
            .map((section) => ({
              column1: section.column1,
              column2Html: section.column2Html,
            }))
        },
        { timeout: 10000 }
      )
      .toEqual([
        {
          column1: '09:00',
          column2Html: '<p>Arrival and welcome</p><p>Still part of the morning</p>',
        },
        { column1: '12:00', column2Html: '<p>Lunch break</p>' },
      ])
  })
})

test.describe('storyboard screenshot', () => {
  let api: APIRequestContext
  let editUrl: string

  test.beforeAll(async () => {
    api = await getAuthContext(bipiUser)
    // The "LA Lagerbau" activity of the basiskurs camp has a fully populated
    // storyboard; bipiUser is a manager there, so it opens in the editor.
    editUrl = await findActivityEditUrl(api, basiskursCampId, 'LA Lagerbau')
  })

  test.afterAll(async () => {
    await api.dispose()
  })

  test('captures the Lagerbau storyboard', async ({ page }) => {
    await loginAndSetCookie(page, null, bipiUser)
    await page.goto(editUrl)

    const editor = page.locator('.e-storyboard-continuous')
    await expect(editor).toBeVisible()
    // A populated storyboard shows several timed sections in the left gutter.
    await expect(page.locator('.e-sb-para--top').first()).toBeVisible()
    expect(await page.locator('.e-sb-para--top').count()).toBeGreaterThanOrEqual(5)

    await editor.scrollIntoViewIfNeeded()
    await editor.screenshot({ path: `${SCREENSHOT_DIR}/lagerbau-storyboard.png` })
  })
})
