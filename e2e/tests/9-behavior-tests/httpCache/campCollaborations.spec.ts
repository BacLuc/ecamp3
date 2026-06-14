import { test, expect } from '@playwright/test'
import { bipiUser, castorUser, grgrCampId } from '@/utils/constants'
import {
  getAuthContext,
  expectCacheHit,
  expectCacheMiss,
  waitForCacheMiss,
  apiGet,
  apiPatch,
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

    test('caches /camp_collaborations/{id} separately for each login', async () => {
      const uri = `/api/camp_collaborations/${bipiCampCollaborationId}`

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

    test('invalidates /camp_collaborations/{id} on campCollaboration patch', async () => {
      const uri = `/api/camp_collaborations/${bipiCampCollaborationId}`

      // bring data into defined state
      const bipiApi = await getAuthContext(bipiUser)
      await apiPatch(bipiApi, `/api/camp_collaborations/${bipiCampCollaborationId}`, {
        abbreviation: null,
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
  }
)
