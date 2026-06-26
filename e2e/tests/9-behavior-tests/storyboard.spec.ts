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

  test('renders the section editor and persists edits', async ({ page }) => {
    await loginAndSetCookie(page, null, bipiUser)
    await page.goto(editUrl)

    const editor = page.locator('.e-storyboard-continuous')
    await expect(editor).toBeVisible()
    await expect(page.locator('.e-sb-section')).toHaveCount(1)
    const firstSection = page.locator('.e-sb-section').first()
    await expect(firstSection).toBeVisible()

    // Screenshot of an empty storyboard section.
    await firstSection.screenshot({
      path: `${SCREENSHOT_DIR}/storyboard-section-empty.png`,
    })

    // The time column understands shorthand and normalizes it on blur.
    const timeInput = firstSection.locator('.e-sb-section__input--time')
    await timeInput.fill('9')
    await timeInput.blur()
    await expect(timeInput).toHaveValue('09:00')

    // The program content is edited as continuous rich text.
    await firstSection.locator('.e-sb-section__program').click()
    await page.keyboard.type('Welcome to camp')

    // The responsible is an inline field next to the program.
    await firstSection.locator('.e-sb-section__input').last().fill('Alice')

    await firstSection.screenshot({
      path: `${SCREENSHOT_DIR}/storyboard-section-filled.png`,
    })

    // Add a second section through the continuous editor toolbar.
    await editor.getByRole('button', { name: /Abschnitt hinzufügen/i }).click()
    await expect(page.locator('.e-sb-section')).toHaveCount(2)

    await editor.screenshot({
      path: `${SCREENSHOT_DIR}/storyboard-continuous-editor.png`,
    })

    // The edits are serialized into the API `sections` structure (debounced).
    await expect
      .poll(
        async () => {
          const data = await getStoryboardData(api, storyboardUri)
          return Object.values(data.sections).map((section) => ({
            column1: section.column1,
            column2Html: section.column2Html,
            column3: section.column3,
          }))
        },
        { timeout: 10000 }
      )
      .toContainEqual({
        column1: '09:00',
        column2Html: '<p>Welcome to camp</p>',
        column3: 'Alice',
      })
  })
})
