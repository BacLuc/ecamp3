import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ApiDatePicker from '../ApiDatePicker.vue'
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

describe('An ApiDatePicker', () => {
  let wrapper
  let apiMock

  const FIELD_PATH = 'test-field/123'
  const FIELD_LABEL = 'Test field'
  const DATE_1 = '2020-03-01'
  const DATE_2 = '2020-03-19'

  beforeEach(() => {
    // Set locale for consistent date formatting
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
      components: { ApiDatePicker },
      props: {
        path: { type: String, default: FIELD_PATH },
      },
      template: `
        <div data-app>
          <api-date-picker
            :auto-save="false"
            :path="path"
            uri="test-field/123"
            label="${FIELD_LABEL}"
            required="true"
          />
        </div>
      `,
    }
    apiMock.get().thenReturn(ApiMock.success(DATE_1).forPath(FIELD_PATH))
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
    apiMock.get().thenReturn(ApiMock.success(DATE_2).forPath(FIELD_PATH))

    wrapper.findComponent(ApiWrapper).vm.reload()

    await waitForDebounce()
    await flushPromises()

    expect(wrapper.findComponent(ApiWrapper).vm.localValue).toBe(DATE_2)
  })
})
