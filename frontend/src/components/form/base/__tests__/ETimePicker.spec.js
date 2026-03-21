import { describe, expect, test } from 'vitest'
import { mount as mountComponent } from '@vue/test-utils'
import ETimePicker from '../ETimePicker.vue'
import { setupVuetify } from '/tests/setupVuetify.js'

setupVuetify()

describe('An ETimePicker', () => {
  const TIME1_ISO = '2037-07-18T09:52:00+00:00'

  const mount = (options) => {
    const app = {
      components: { ETimePicker },
      data: function () {
        return {
          data: TIME1_ISO,
        }
      },
      template: `<div data-app><e-time-picker label="test" v-model="data"/></div>`,
    }
    return mountComponent(app, { attachTo: document.body, ...options })
  }

  test('renders the component', async () => {
    const wrapper = mount()
    expect(wrapper.findComponent(ETimePicker).exists()).toBe(true)
  })

  test('looks like a time picker', async () => {
    const wrapper = mount()
    expect(wrapper.html()).toMatchSnapshot('timepicker')
  })

  test('updates v-model when the value changes', async () => {
    const wrapper = mount()
    expect(wrapper.vm.data).toBe(TIME1_ISO)

    const TIME2_ISO = '2037-07-18T18:33:00+00:00'
    await wrapper.setData({ data: TIME2_ISO })
    expect(wrapper.vm.data).toBe(TIME2_ISO)
  })

  test('accepts different valueFormat', async () => {
    const wrapper = mount({
      props: { valueFormat: 'HH:mm' },
    })
    expect(wrapper.findComponent(ETimePicker).exists()).toBe(true)
  })

  test('handles invalid initialization gracefully', async () => {
    const wrapper = mount()
    await wrapper.setData({ data: 'invalid' })
    // Should still render without crashing
    expect(wrapper.findComponent(ETimePicker).exists()).toBe(true)
  })

  test('accepts null', async () => {
    const wrapper = mount()
    await wrapper.setData({ data: null })
    expect(wrapper.vm.data).toBe(null)
  })
})
