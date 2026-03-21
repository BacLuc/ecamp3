// Mock for hal-json-vuex - Vue 3 compatible
import { vi } from 'vitest'

export default vi.fn().mockImplementation(() => ({
  install: () => {},
}))
