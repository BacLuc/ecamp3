import { test, expect } from '@playwright/test'
import { bipiUser, castorUser, grgrCampId, grgrPeriodId } from '@/utils/constants'
import {
  expectCacheHit,
  expectCacheMiss,
  waitForCacheMiss,
  apiGet,
  apiPatch,
  getAuthContext,
} from '@/utils/helpers'

// Material item in grgr period - used to trigger cache invalidation
const materialItemId = '01fa888341f6'
const materialListId = '6e57f36875d4'

test.describe('cache test: /camps/{id}/material_items', { tag: '@mature' }, () => {
  test.describe.configure({ mode: 'serial' })

  test('caches /camps/{id}/material_items?period= separately for each login', async () => {
    const uri = `/api/camps/${grgrCampId}/material_items`
    const params = { period: `/api/periods/${grgrPeriodId}` }

    const bipiApi = await getAuthContext(bipiUser)

    // first request is a cache miss
    await expectCacheMiss(bipiApi, uri, params)

    // second request is a cache hit
    await expectCacheHit(bipiApi, uri, params)

    // request with a different user is a cache miss
    const castorApi = await getAuthContext(castorUser)
    await expectCacheMiss(castorApi, uri, params)
  })

  test('caches ?period= and ?period=&materialList= as separate cache entries', async () => {
    const uri = `/api/camps/${grgrCampId}/material_items`
    const periodParams = { period: `/api/periods/${grgrPeriodId}` }
    const filteredParams = {
      period: `/api/periods/${grgrPeriodId}`,
      materialList: `/api/material_lists/${materialListId}`,
    }

    const bipiApi = await getAuthContext(bipiUser)

    // warm up base period collection
    await apiGet(bipiApi, uri, periodParams)
    await expectCacheHit(bipiApi, uri, periodParams)

    // materialList-filtered request is a separate cache entry (MISS)
    await expectCacheMiss(bipiApi, uri, filteredParams)
    await expectCacheHit(bipiApi, uri, filteredParams)

    // base collection should still be a HIT (separate cache entry)
    await expectCacheHit(bipiApi, uri, periodParams)
  })

  test('invalidates /camps/{id}/material_items?period= on material item patch', async () => {
    const uri = `/api/camps/${grgrCampId}/material_items`
    const params = { period: `/api/periods/${grgrPeriodId}` }

    // bring data into defined state
    const bipiApi = await getAuthContext(bipiUser)
    await apiPatch(bipiApi, `/api/material_items/${materialItemId}`, {
      quantity: 20,
    })

    // warm up cache
    await apiGet(bipiApi, uri, params)
    await expectCacheHit(bipiApi, uri, params)

    // touch material item
    await apiPatch(bipiApi, `/api/material_items/${materialItemId}`, {
      quantity: 25,
    })

    // ensure cache was invalidated
    await waitForCacheMiss(bipiApi, uri, params)
    await expectCacheHit(bipiApi, uri, params)

    // restore original state
    await apiPatch(bipiApi, `/api/material_items/${materialItemId}`, {
      quantity: 20,
    })

    await waitForCacheMiss(bipiApi, uri, params)
    await expectCacheHit(bipiApi, uri, params)
  })

  test('invalidates ?period= and ?period=&materialList= together on material item patch', async () => {
    const uri = `/api/camps/${grgrCampId}/material_items`
    const periodParams = { period: `/api/periods/${grgrPeriodId}` }
    const filteredParams = {
      period: `/api/periods/${grgrPeriodId}`,
      materialList: `/api/material_lists/${materialListId}`,
    }

    const bipiApi = await getAuthContext(bipiUser)

    // warm up both cache entries
    await apiGet(bipiApi, uri, periodParams)
    await apiGet(bipiApi, uri, filteredParams)
    await expectCacheHit(bipiApi, uri, periodParams)
    await expectCacheHit(bipiApi, uri, filteredParams)

    // touch material item in period
    await apiPatch(bipiApi, `/api/material_items/${materialItemId}`, {
      quantity: 22,
    })

    // both cache entries should be invalidated
    await waitForCacheMiss(bipiApi, uri, periodParams)
    await waitForCacheMiss(bipiApi, uri, filteredParams)

    // both should be cacheable again
    await expectCacheHit(bipiApi, uri, periodParams)
    await expectCacheHit(bipiApi, uri, filteredParams)

    // restore
    await apiPatch(bipiApi, `/api/material_items/${materialItemId}`, {
      quantity: 20,
    })
  })

  test('validates that xkey includes camp-scoped collection IRI', async () => {
    const uri = `/api/camps/${grgrCampId}/material_items`
    const params = { period: `/api/periods/${grgrPeriodId}` }

    const bipiApi = await getAuthContext(bipiUser)
    const response = await apiGet(bipiApi, uri, params)
    const xkey = response.headers()['xkey']

    expect(xkey).toContain(`/api/camps/${grgrCampId}/material_items`)
  })
})
