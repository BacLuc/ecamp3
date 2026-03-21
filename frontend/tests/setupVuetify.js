import { config } from '@vue/test-utils'
import Vuetify from '@/plugins/vuetify.js'
import { vi } from 'vitest'

// Create a mock api store that can be used by tests
const mockApiStore = {
  get: vi.fn().mockReturnValue({
    _meta: { load: Promise.resolve({}) },
  }),
  post: vi.fn().mockResolvedValue({}),
  patch: vi.fn().mockResolvedValue({}),
}

export function setupVuetify() {
  config.global.plugins = [Vuetify]
  // Provide the mock api as a global property (like hal-json-vuex does)
  config.global.mocks = {
    api: mockApiStore,
  }
}

// Export for use in tests
export { mockApiStore }
