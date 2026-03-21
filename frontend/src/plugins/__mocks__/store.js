// Mock for @/plugins/store - provides minimal API mock for tests
import { vi } from 'vitest'

// Create a simple mock store
export const apiStore = {
  get: vi.fn().mockReturnValue({
    _meta: { load: Promise.resolve({}) },
  }),
  post: vi.fn(),
  patch: vi.fn(),
}

export const store = {
  state: {},
  getters: {},
  commit: vi.fn(),
  dispatch: vi.fn(),
  replaceState: vi.fn(),
}

export default {
  install: () => {},
}
