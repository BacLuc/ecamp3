import { describe, expect, test } from 'vitest'
import ApiWrapper from '../ApiWrapper.vue'
import { mount as mountComponent } from '@vue/test-utils'
import { setupVuetify } from '/tests/setupVuetify.js'

setupVuetify()

describe('ApiWrapper', () => {
  const mount = (options = {}) => {
    const app = {
      components: { ApiWrapper },
      data: () => ({
        data: 'Test Value',
      }),
      template: `
        <div data-app>
          <api-wrapper
            v-model="data"
            path="testField"
            uri="/testEntity/123"
            label="Test Field"
          >
            <template #default="props">
              <input type="text" :value="props.localValue" />
            </template>
          </api-wrapper>
        </div>
      `,
    }
    return mountComponent(app, { attachTo: document.body })
  }

  test('renders the component', async () => {
    const wrapper = mount()
    const apiWrapper = wrapper.findComponent(ApiWrapper)
    expect(apiWrapper.exists()).toBe(true)
  })

  test('has autoSave enabled by default', async () => {
    const wrapper = mount()
    const apiWrapper = wrapper.findComponent(ApiWrapper)
    expect(apiWrapper.vm.autoSave).toBe(true)
  })

  test('has correct initial state', async () => {
    const wrapper = mount()
    const apiWrapper = wrapper.findComponent(ApiWrapper)
    expect(apiWrapper.vm.dirty).toBe(false)
    expect(apiWrapper.vm.isSaving).toBe(false)
    expect(apiWrapper.vm.isLoading).toBe(false)
    expect(apiWrapper.vm.status).toBe('init')
  })
})
