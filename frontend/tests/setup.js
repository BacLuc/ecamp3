import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/vue'
import '@testing-library/jest-dom/vitest'
import snapshotSerializer from 'jest-serializer-vue-tjw'
import 'vitest-canvas-mock'

class ResizeObserver {
  // noinspection JSUnusedGlobalSymbols
  observe() {}
  // noinspection JSUnusedGlobalSymbols
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver

// Mock the store module to avoid Vue 2 dependencies
vi.mock('@/plugins/store', () => ({
  default: {
    install: () => {},
  },
  store: {
    state: {},
    getters: {},
    commit: vi.fn(),
    dispatch: vi.fn(),
    replaceState: vi.fn(),
  },
  apiStore: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

// Mock hal-json-vuex
vi.mock('hal-json-vuex', () => ({
  default: vi.fn(),
}))

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

expect.addSnapshotSerializer(snapshotSerializer)
