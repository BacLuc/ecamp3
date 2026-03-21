import { describe, expect, test } from 'vitest'
import { mount as mountComponent } from '@vue/test-utils'
import ESwitch from '@/components/form/base/ESwitch.vue'
import { screen } from '@testing-library/vue'
import { setupVuetify } from '/tests/setupVuetify.js'

setupVuetify()

describe('An ESwitch', () => {
  const mount = (options) => {
    const app = {
      components: { ESwitch },
      data: function () {
        return {
          data: null,
        }
      },
      template: `
        <div data-app>
          <e-switch label="test" v-model="data">
            ${options?.children}
          </e-switch>
        </div>
      `,
    }
    return mountComponent(app, { attachTo: document.body, ...options })
  }

  test('looks like a switch', async () => {
    const wrapper = mount()
    await wrapper.setData({ data: false })
    expect(wrapper.html()).toMatchSnapshot('unchecked')

    await wrapper.setData({ data: true })
    expect(wrapper.html()).toMatchSnapshot('checked')
  })

  test('is checked when initialized checked', () => {
    const wrapper = mount({
      data: function () {
        return {
          data: true,
        }
      },
    })
    // Check that the input has the checked attribute
    const input = wrapper.find('input[type=checkbox]')
    expect(input.element.checked).toBe(true)
  })

  test('updates switch when vModel changes', async () => {
    const wrapper = mount()
    expect(wrapper.find('input[type=checkbox]').element.checked).toBe(false)

    await wrapper.setData({ data: true })
    expect(wrapper.find('input[type=checkbox]').element.checked).toBe(true)

    await wrapper.setData({ data: false })
    expect(wrapper.find('input[type=checkbox]').element.checked).toBe(false)
  })

  test('updates vModel when user toggles with click', async () => {
    const wrapper = mount()
    const input = wrapper.find('input')

    await input.trigger('click')
    expect(wrapper.vm.data).toBe(true)

    await input.trigger('click')
    expect(wrapper.vm.data).toBe(false)
  })

  test('allows to use the append slot', async () => {
    mount({
      children: `
        <template #append>
          <span>append</span>
        </template>
      `,
    })

    expect(await screen.findByText('append')).toBeVisible()
  })
})
