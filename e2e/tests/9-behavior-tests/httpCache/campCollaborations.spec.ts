import { test, expect } from '@playwright/test'
import { bipiUser, castorUser, grgrCampId } from '@/utils/constants'
import {
  getAuthContext,
  expectCacheHit,
  expectCacheMiss,
  waitForCacheMiss,
  apiGet,
  apiPatch,
  loginAndSetCookie,
  apiDelete,
} from '@/utils/helpers'

const bipiCampCollaborationId = 'b0bdb7202a9d'

test.describe(
  'cache test: /camps/{campId}/camp_collaborations',
  { tag: '@mature' },
  () => {
    test.describe.configure({ mode: 'serial' })

    test('caches /camps/{campId}/camp_collaborations separately for each login', async () => {
      const uri = `/api/camps/${grgrCampId}/camp_collaborations`

      const bipiApi = await getAuthContext(bipiUser)

      // first request is a cache miss
      const res1 = await apiGet(bipiApi, uri)
      expect(res1.headers()['x-cache']).toBe('MISS')

      // second request is a cache hit
      await expectCacheHit(bipiApi, uri)

      // request with a new user is a cache miss
      const castorApi = await getAuthContext(castorUser)
      await expectCacheMiss(castorApi, uri)
    })

    test('invalidates /camps/{campId}/camp_collaborations on campCollaboration patch', async () => {
      const uri = `/api/camps/${grgrCampId}/camp_collaborations`

      // bring data into defined state
      const bipiApi = await getAuthContext(bipiUser)
      await apiPatch(bipiApi, `/api/camp_collaborations/${bipiCampCollaborationId}`, {
        abbreviation: 'bi',
      })

      // warm up cache
      await apiGet(bipiApi, uri)
      await expectCacheHit(bipiApi, uri)

      // touch campCollaboration
      await apiPatch(bipiApi, `/api/camp_collaborations/${bipiCampCollaborationId}`, {
        abbreviation: 'BP',
      })

      // ensure cache was invalidated
      await waitForCacheMiss(bipiApi, uri)
      await expectCacheHit(bipiApi, uri)

      // restore original state
      await apiPatch(bipiApi, `/api/camp_collaborations/${bipiCampCollaborationId}`, {
        abbreviation: null,
      })
    })

    test('invalidates cached data when user leaves a camp', async ({ browser }) => {
      const castorContext = await browser.newContext()
      const bipiContext = await browser.newContext()
      const castorPage = await castorContext.newPage()
      const bipiPage = await bipiContext.newPage()
      await loginAndSetCookie(castorPage, castorContext, castorUser)
      await loginAndSetCookie(bipiPage, bipiContext, bipiUser)
      const uri = `/api/camps/${grgrCampId}/camp_collaborations`

      const castorApi = castorContext.request
      const bipiApi = bipiContext.request

      // warm up cache
      await apiGet(castorApi, uri)
      await expectCacheHit(castorApi, uri)

      // deactivate Castor
      await bipiPage.goto(`/camps/${grgrCampId}/GRGR/admin/collaborators`)
      await bipiPage.locator('.v-list-item__title', { hasText: 'Castor' }).click()
      await bipiPage.getByRole('button', { name: 'Deaktivieren' }).first().click()
      await Promise.all([
        bipiPage.waitForResponse(
          (res) =>
            res.url().includes('/api/camp_collaborations/') &&
            res.request().method() === 'PATCH'
        ),
        bipiPage
          .locator('div[role="alert"]')
          .getByRole('button', { name: 'Deaktivieren' })
          .click(),
      ])

      await expectCacheMiss(bipiApi, uri)
      await expectCacheHit(bipiApi, uri)

      // ensure cache was invalidated
      const notFoundRes = await apiGet(castorApi, uri)
      expect(notFoundRes.status()).toBe(404)

      // delete old emails
      await apiDelete(bipiApi, '/mail/email/all')

      // invite Castor
      await bipiPage.locator('.v-list-item__title', { hasText: 'Castor' }).click()
      await Promise.all([
        bipiPage.waitForResponse(
          (res) =>
            res.url().includes('/api/camp_collaborations/') &&
            res.request().method() === 'PATCH'
        ),
        bipiPage.getByRole('button', { name: 'Erneut einladen' }).click(),
      ])

      await expectCacheMiss(bipiApi, uri)
      await expectCacheHit(bipiApi, uri)

      // accept invitation as Castor
      const emailRes = await castorApi.get('/mail/email')
      const emails = await emailRes.json()
      const emailHtmlContent = emails[0].html
      await castorPage.setContent(emailHtmlContent)
      const [newPage] = await Promise.all([
        castorContext.waitForEvent('page'),
        castorPage.locator('a', { hasText: 'Einladung beantworten' }).click(),
      ])
      await Promise.all([
        newPage.waitForResponse(
          (res) =>
            res.url().includes('/api/invitations/') && res.request().method() === 'PATCH'
        ),
        newPage
          .getByRole('button', { name: 'Einladung mit aktuellem Account akzeptieren' })
          .click(),
      ])
      await newPage.goto('/camps')

      await apiGet(castorApi, uri)
      await expectCacheHit(castorApi, uri)

      await expectCacheMiss(bipiApi, uri)
      await expectCacheHit(bipiApi, uri)
    })
  }
)
