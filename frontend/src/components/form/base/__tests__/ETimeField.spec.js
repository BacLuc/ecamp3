import { describe, expect, test } from 'vitest'
import ETimeField from '@/components/form/base/ETimeField.vue'
import { mount as mountComponent } from '@vue/test-utils'
import { setupVuetify } from '/tests/setupVuetify.js'

setupVuetify()

describe('An ETimeField', () => {
  const mount = (options) => {
    const app = {
      components: { ETimeField },
      data: function () {
        return {
          data: null,
        }
      },
      template: `<div data-app><e-time-field label="test" v-model="data"/></div>`,
    }
    return mountComponent(app, { attachTo: document.body, ...options })
  }

  test.each([
    ['8', '08:00'],
    [' 9 ', '09:00'],
    ['2400', null],
    ['19,34', '19:34'],
    ['19h34', '19:34'],
    ['', null],
  ])('parses "%s" as "%s"', async (string, expected) => {
    const wrapper = mount()
    const input = wrapper.find('input')

    input.element.value = `${string}`
    await input.trigger('input')

    expect(wrapper.vm.data).toBe(expected)
  })
})
