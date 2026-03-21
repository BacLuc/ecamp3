import { describe, expect, test } from 'vitest'
import { mount as mountComponent } from '@vue/test-utils'
import EDatePicker from '../EDatePicker.vue'
import { setupVuetify } from '/tests/setupVuetify.js'

setupVuetify()

describe('An EDatePicker', () => {
  const DATE1_ISO = '2020-03-01'

  const mount = (options) => {
    const app = {
      components: { EDatePicker },
      data: function () {
        return {
          data: DATE1_ISO,
        }
      },
      template: `<div data-app><e-date-picker label="test" v-model="data"/></div>`,
    }
    return mountComponent(app, { attachTo: document.body, ...options })
  }

  test('renders the component', async () => {
    const wrapper = mount()
    expect(wrapper.findComponent(EDatePicker).exists()).toBe(true)
  })

  test('looks like a date picker', async () => {
    const wrapper = mount()
    expect(wrapper.html()).toMatchSnapshot('datepicker')
  })

  test('updates v-model when the value changes', async () => {
    const wrapper = mount()
    expect(wrapper.vm.data).toBe(DATE1_ISO)

    const DATE2_ISO = '2020-03-19'
    await wrapper.setData({ data: DATE2_ISO })
    expect(wrapper.vm.data).toBe(DATE2_ISO)
  })

  test('validates input', async () => {
    const wrapper = mount()
    expect(wrapper.vm.data).toBe(DATE1_ISO)
  })

  test('handles min prop', async () => {
    const wrapper = mount({
      props: { min: '2020-01-01' },
    })
    expect(wrapper.findComponent(EDatePicker).exists()).toBe(true)
  })

  test('handles max prop', async () => {
    const wrapper = mount({
      props: { max: '2025-12-31' },
    })
    expect(wrapper.findComponent(EDatePicker).exists()).toBe(true)
  })

  test('accepts null', async () => {
    const wrapper = mount()
    await wrapper.setData({ data: null })
    expect(wrapper.vm.data).toBe(null)
  })
})
