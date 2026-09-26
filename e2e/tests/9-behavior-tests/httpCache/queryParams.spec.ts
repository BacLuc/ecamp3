import { test, expect } from '@playwright/test'
import { bruceWayneUser, loremIpsumCampId } from '@/utils/constants'
import {
  getAuthContext,
  expectCacheHit,
  expectCacheMiss,
  waitForCacheMiss,
  apiGet,
  apiPatch,
} from '@/utils/helpers'

const collectionUri = `/api/camps/${loremIpsumCampId}/activities`
const filteredUri = `${collectionUri}?camp=%2Fcamps%2F${loremIpsumCampId}&page=1`
const reversedUri = `${collectionUri}?page=1&camp=%2Fcamps%2F${loremIpsumCampId}`
const activityId = '3d1e5c91ceb2'

test.describe('cache test: collection with query params', () => {
  test.describe.configure({ mode: 'serial' })

  test('caches a filtered url and tags it like the unfiltered one', async () => {
    const bruceApi = await getAuthContext(bruceWayneUser)

    const filtered = await apiGet(bruceApi, filteredUri)
    expect(filtered.headers()['x-cache']).toBe('MISS')
    expect(filtered.headers()['xkey']).toContain(collectionUri)

    await expectCacheHit(bruceApi, filteredUri)

    const unfiltered = await apiGet(bruceApi, collectionUri)
    expect(unfiltered.headers()['x-cache']).toBe('MISS')
    expect(
      stripComma(
        `${unfiltered.headers()['xkey']} /api/camps/${loremIpsumCampId}/activities?`
      )
    ).toEqual(stripComma(filtered.headers()['xkey']))
  })

  test('caches the same params in a different order as a separate entry', async () => {
    const bruceApi = await getAuthContext(bruceWayneUser)

    await apiGet(bruceApi, filteredUri)
    await expectCacheHit(bruceApi, filteredUri)

    await expectCacheMiss(bruceApi, reversedUri)
    await expectCacheHit(bruceApi, reversedUri)
  })

  test('invalidates every variant of the collection on activity patch', async () => {
    const bruceApi = await getAuthContext(bruceWayneUser)

    await apiPatch(bruceApi, `/api/activities/${activityId}`, {
      title: 'Breakfast',
    })

    await apiGet(bruceApi, collectionUri)
    await expectCacheHit(bruceApi, collectionUri)
    await apiGet(bruceApi, filteredUri)
    await expectCacheHit(bruceApi, filteredUri)

    await apiPatch(bruceApi, `/api/activities/${activityId}`, {
      title: 'Frühstück',
    })

    await waitForCacheMiss(bruceApi, collectionUri)
    await expectCacheHit(bruceApi, collectionUri)
    await waitForCacheMiss(bruceApi, filteredUri)
    await expectCacheHit(bruceApi, filteredUri)
  })
})

function stripComma(string: string) {
  return string.replaceAll(',', '')
}
