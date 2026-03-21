import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ApiColorPicker from '../ApiColorPicker.vue'
import ApiWrapper from '@/components/form/api/ApiWrapper.vue'
import flushPromises from 'flush-promises'
import merge from 'lodash-es/merge'
import { ApiMock } from '@/components/form/api/__tests__/ApiMock'
import { mount as mountComponent } from '@vue/test-utils'
import { waitForDebounce } from '@/test/util'
import { setupVuetify } from '/tests/setupVuetify.js'
import { i18n } from '@/plugins'
import { ColorSpace, sRGB } from 'colorjs.io/fn'

ColorSpace.register(sRGB)

setupVuetify()

describe('An ApiColorPicker', () => {
  let wrapper
  let apiMock

  const FIELD_PATH = 'test-field/123'
  const FIELD_LABEL = 'Test field'
  const COLOR_1 = '#FF0000'
  const COLOR_2 = '#FAFFAF'

  beforeEach(() => {
    apiMock = ApiMock.create()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (wrapper) {
      wrapper.unmount()
    }
  })

  const mount = (options) => {
    const app = {
      components: { ApiColorPicker },
      props: {
        path: { type: String, default: FIELD_PATH },
      },
      template: `
        <div data-app>
          <api-color-picker
            :auto-save="false"
            :path="path"
            uri="test-field/123"
            label="${FIELD_LABEL}"
            required="true"
          />
        </div>
      `,
    }
    apiMock.get().thenReturn(ApiMock.success(COLOR_1).forPath(FIELD_PATH))
    const defaultOptions = {
      global: {
        mocks: {
          $t: (key) => key,
          api: apiMock.getMocks(),
        },
      },
    }
    return mountComponent(app, {
      i18n,
      attachTo: document.body,
      ...merge(defaultOptions, options),
    })
  }

  test('updates state if value in store is refreshed and has new value', async () => {
    wrapper = mount()
    apiMock.get().thenReturn(ApiMock.success(COLOR_2).forPath(FIELD_PATH))

    wrapper.findComponent(ApiWrapper).vm.reload()

    await waitForDebounce()
    await flushPromises()

    expect(wrapper.findComponent(ApiWrapper).vm.localValue).toBe(COLOR_2)
  })
})
