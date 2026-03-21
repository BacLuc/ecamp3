import { describe, expect, test } from 'vitest'
import { mount as mountComponent } from '@vue/test-utils'
import EColorPicker from '../EColorPicker.vue'
import { setupVuetify } from '/tests/setupVuetify.js'

setupVuetify()

describe('An EColorPicker', () => {
  const COLOR1 = '#FF0000'

  const mount = (options) => {
    const app = {
      components: { EColorPicker },
      data: function () {
        return {
          data: COLOR1,
        }
      },
      template: `<div data-app><e-color-picker label="test" v-model="data"/></div>`,
    }
    return mountComponent(app, { attachTo: document.body, ...options })
  }

  test('renders the component', async () => {
    const wrapper = mount()
    // Check that the color field is rendered
    expect(wrapper.findComponent(EColorPicker).exists()).toBe(true)
  })

  test('looks like a color picker', async () => {
    const wrapper = mount()
    expect(wrapper.html()).toMatchSnapshot('colorpicker')
  })

  test('updates v-model when the value changes', async () => {
    const wrapper = mount()
    expect(wrapper.vm.data).toBe(COLOR1)

    const COLOR2 = '#00FF00'
    await wrapper.setData({ data: COLOR2 })
    expect(wrapper.vm.data).toBe(COLOR2)
  })

  test('accepts null', async () => {
    const wrapper = mount()
    await wrapper.setData({ data: null })
    expect(wrapper.vm.data).toBe(null)
  })
})
