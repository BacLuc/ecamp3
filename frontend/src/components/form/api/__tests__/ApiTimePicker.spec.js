import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ApiTimePicker from '../ApiTimePicker.vue'
import ApiWrapper from '@/components/form/api/ApiWrapper.vue'
import flushPromises from 'flush-promises'
import merge from 'lodash-es/merge'
import { ApiMock } from '@/components/form/api/__tests__/ApiMock'
import { mount as mountComponent } from '@vue/test-utils'
import { waitForDebounce } from '@/test/util'
import { setupVuetify } from '/tests/setupVuetify.js'
import { i18n } from '@/plugins'
import dayjs from '@/common/helpers/dayjs.js'

setupVuetify()

describe('An ApiTimePicker', () => {
  let wrapper
  let apiMock

  const FIELD_PATH = 'test-field/123'
  const FIELD_LABEL = 'Test field'
  const TIME_1 = '2037-07-18T09:52:00+00:00'
  const TIME_2 = '2037-07-18T00:52:00+00:00'

  beforeEach(() => {
    // Set locale for consistent time formatting
    dayjs.locale('de')
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
      components: { ApiTimePicker },
      props: {
        path: { type: String, default: FIELD_PATH },
      },
      template: `
        <div data-app>
          <api-time-picker
            :auto-save="false"
            :path="path"
            uri="test-field/123"
            label="${FIELD_LABEL}"
            required="true"
          />
        </div>
      `,
    }
    apiMock.get().thenReturn(ApiMock.success(TIME_1).forPath(FIELD_PATH))
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
    apiMock.get().thenReturn(ApiMock.success(TIME_2).forPath(FIELD_PATH))

    wrapper.findComponent(ApiWrapper).vm.reload()

    await waitForDebounce()
    await flushPromises()

    expect(wrapper.findComponent(ApiWrapper).vm.localValue).toBe(TIME_2)
  })
})
