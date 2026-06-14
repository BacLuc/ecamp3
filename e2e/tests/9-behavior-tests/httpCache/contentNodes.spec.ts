import { test, expect } from '@playwright/test'
import {
  bipiUser,
  bruceWayneUser,
  grgrCampId,
  grgrPeriodId,
  skilagerCampId,
  skilagerPeriodId,
} from '@/utils/constants'
import {
  expectCacheHit,
  expectCacheMiss,
  waitForCacheMiss,
  apiGet,
  apiPatch,
  getAuthContext,
} from '@/utils/helpers'

const contentTypeNotes = '/api/content_types/4f0c657fecef'
const contentTypeStoryboard = '/api/content_types/cfccaecd4bad'

// Notes SingleText content node in grgr period - used to trigger cache invalidation.
// bipiUser has write access to the grgr camp.
const singleTextId = '2c836d5e9ad0'

test.describe('cache test: /camps/{id}/content_nodes', { tag: '@mature' }, () => {
  test.describe.configure({ mode: 'serial' })

  // Uses skilager period (8 content nodes) to avoid Playwright header size limits
  // that would occur with grgr period (152 content nodes)
  test('caches /camps/{id}/content_nodes?period= separately for each login', async () => {
    const uri = `/api/camps/${skilagerCampId}/content_nodes`
    const params = { period: `/api/periods/${skilagerPeriodId}` }

    const bipiApi = await getAuthContext(bipiUser)

    // first request is a cache miss
    await expectCacheMiss(bipiApi, uri, params)

    // second request is a cache hit
    await expectCacheHit(bipiApi, uri, params)

    // request with a new user is a cache miss
    const bruceApi = await getAuthContext(bruceWayneUser)
    await expectCacheMiss(bruceApi, uri, params)
  })

  test('caches ?period= and ?period=&contentType= as separate cache entries', async () => {
    const uri = `/api/camps/${skilagerCampId}/content_nodes`
    const periodParams = { period: `/api/periods/${skilagerPeriodId}` }
    const filteredParams = {
      period: `/api/periods/${skilagerPeriodId}`,
      contentType: contentTypeNotes,
    }

    const bipiApi = await getAuthContext(bipiUser)

    // warm up base period collection
    await apiGet(bipiApi, uri, periodParams)
    await expectCacheHit(bipiApi, uri, periodParams)

    // contentType-filtered request is a separate cache entry (MISS)
    await expectCacheMiss(bipiApi, uri, filteredParams)
    await expectCacheHit(bipiApi, uri, filteredParams)

    // base collection should still be a HIT (separate cache entry)
    await expectCacheHit(bipiApi, uri, periodParams)
  })

  // Uses grgr period with contentType filter to stay within Playwright's header
  // size limits (152 unfiltered content nodes would exceed them).
  // bipiUser has write access to the grgr camp.
  test('invalidates /camps/{id}/content_nodes?period=&contentType= on content node patch', async () => {
    const uri = `/api/camps/${grgrCampId}/content_nodes`
    const params = {
      period: `/api/periods/${grgrPeriodId}`,
      contentType: contentTypeNotes,
    }

    // bring data into defined state
    const bipiApi = await getAuthContext(bipiUser)
    await apiPatch(bipiApi, `/api/content_node/single_texts/${singleTextId}`, {
      slot: 'aside-bottom',
    })

    // warm up cache
    await apiGet(bipiApi, uri, params)
    await expectCacheHit(bipiApi, uri, params)

    // touch content node
    await apiPatch(bipiApi, `/api/content_node/single_texts/${singleTextId}`, {
      slot: 'aside-top',
    })

    // ensure cache was invalidated
    await waitForCacheMiss(bipiApi, uri, params)
    await expectCacheHit(bipiApi, uri, params)

    // restore original state
    await apiPatch(bipiApi, `/api/content_node/single_texts/${singleTextId}`, {
      slot: 'aside-bottom',
    })

    await waitForCacheMiss(bipiApi, uri, params)
    await expectCacheHit(bipiApi, uri, params)
  })

  test('invalidates ?period=&contentType= for different contentType filters on patch', async () => {
    const uri = `/api/camps/${grgrCampId}/content_nodes`
    const notesParams = {
      period: `/api/periods/${grgrPeriodId}`,
      contentType: contentTypeNotes,
    }
    const storyboardParams = {
      period: `/api/periods/${grgrPeriodId}`,
      contentType: contentTypeStoryboard,
    }

    const bipiApi = await getAuthContext(bipiUser)

    // bring into defined state: slot = 'aside-top' (different from 'aside-bottom' used in prior test)
    await apiPatch(bipiApi, `/api/content_node/single_texts/${singleTextId}`, {
      slot: 'aside-top',
    })

    // warm up both cache entries
    await apiGet(bipiApi, uri, notesParams)
    await apiGet(bipiApi, uri, storyboardParams)
    await expectCacheHit(bipiApi, uri, notesParams)
    await expectCacheHit(bipiApi, uri, storyboardParams)

    // touch a Notes content node in the period with a change
    await apiPatch(bipiApi, `/api/content_node/single_texts/${singleTextId}`, {
      slot: 'aside-bottom',
    })

    // only the Notes cache entry should be invalidated (not the Storyboard one)
    await waitForCacheMiss(bipiApi, uri, notesParams)
    await expectCacheHit(bipiApi, uri, storyboardParams)

    // Notes entry should be cacheable again
    await expectCacheHit(bipiApi, uri, notesParams)
  })

  test('validates that xkey includes camp-scoped collection IRI', async () => {
    const uri = `/api/camps/${skilagerCampId}/content_nodes`
    const params = { period: `/api/periods/${skilagerPeriodId}` }

    const bipiApi = await getAuthContext(bipiUser)
    const response = await apiGet(bipiApi, uri, params)
    const xkey = response.headers()['xkey']

    expect(xkey).toContain(`/api/camps/${skilagerCampId}/content_nodes`)
  })

  test('patching in one camp does not invalidate content_nodes cache of another camp', async () => {
    const grgrUri = `/api/camps/${grgrCampId}/content_nodes`
    const grgrParams = {
      period: `/api/periods/${grgrPeriodId}`,
      contentType: contentTypeNotes,
    }
    const skilagerUri = `/api/camps/${skilagerCampId}/content_nodes`
    const skilagerParams = { period: `/api/periods/${skilagerPeriodId}` }

    const bipiApi = await getAuthContext(bipiUser)

    // bring grgr into defined state
    await apiPatch(bipiApi, `/api/content_node/single_texts/${singleTextId}`, {
      slot: 'aside-bottom',
    })

    // warm up both camp caches
    await apiGet(bipiApi, grgrUri, grgrParams)
    await apiGet(bipiApi, skilagerUri, skilagerParams)
    await expectCacheHit(bipiApi, grgrUri, grgrParams)
    await expectCacheHit(bipiApi, skilagerUri, skilagerParams)

    // patch a content node in grgr camp
    await apiPatch(bipiApi, `/api/content_node/single_texts/${singleTextId}`, {
      slot: 'aside-top',
    })

    // grgr cache should be invalidated
    await waitForCacheMiss(bipiApi, grgrUri, grgrParams)

    // skilager cache should NOT be invalidated (different camp)
    await expectCacheHit(bipiApi, skilagerUri, skilagerParams)

    // restore
    await apiPatch(bipiApi, `/api/content_node/single_texts/${singleTextId}`, {
      slot: 'aside-bottom',
    })
  })
})
