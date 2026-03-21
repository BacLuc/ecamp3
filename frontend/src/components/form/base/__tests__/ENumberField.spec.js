import { describe, expect, test } from 'vitest'
import { mount as mountComponent } from '@vue/test-utils'
import ENumberField from '../ENumberField.vue'
import { screen } from '@testing-library/vue'
import { setupVuetify } from '/tests/setupVuetify.js'

setupVuetify()

describe('An ENumberField', () => {
  const mount = (options) => {
    const app = {
      components: { ENumberField },
      data: function () {
        return {
          data: null,
        }
      },
      template: `
        <div data-app>
          <e-number-field label="test" v-model="data">
            ${options?.children}
          </e-number-field>
        </div>
      `,
    }
    return mountComponent(app, { attachTo: document.body, ...options })
  }

  test('looks like a numberfield', async () => {
    const wrapper = mount()
    expect(wrapper.html()).toMatchSnapshot('empty')

    await wrapper.setData({ data: 3.14 })
    expect(wrapper.html()).toMatchSnapshot('with text')
  })

  test('updates text when vModel changes', async () => {
    const wrapper = mount()
    const input = wrapper.find('input').element
    expect(input.value).toBeDefined()

    const firstNumber = 0
    await wrapper.setData({ data: firstNumber })
    expect(input.value).toBe(`${firstNumber}`)

    const secondNumber = 3.14
    await wrapper.setData({ data: secondNumber })
    expect(input.value).toBe(`${secondNumber}`)
  })

  test('updates vModel when value of input field changes', async () => {
    const wrapper = mount()
    const input = wrapper.find('input')
    const number = 3.14

    input.element.value = `${number}`
    await input.trigger('input')

    expect(wrapper.vm.data).toBe(number)
  })

  test('updates vModel with null or valid numbers', async () => {
    const wrapper = mount()
    const input = wrapper.find('input')

    expect(wrapper.vm.data).toBeNull()

    input.element.value = '.'
    await input.trigger('input')
    expect(wrapper.vm.data).toBeNull()

    input.element.value = '.0'
    await input.trigger('input')
    expect(wrapper.vm.data).toBeNull()

    input.element.value = '.01'
    await input.trigger('input')
    expect(wrapper.vm.data).toBe(0.01)
  })

  test.each([
    ['1', 1],
    ['1.', 1],
    ['1..2', 1.2],
    ['39.5.', 39.5],
    ["2'000", 2000],
    ['8.000.000,20', 8000000.2],
    ['10e3', 103],
    ['2kg', 2],
    ['8,000.20', 8000.2],
    ['abc123', 123],
    ['Hello, World?', null],
    ['eCamp. Super!', null],
    ['+123..456..789', 123.456789],
    ['-10', -10],
    ['2-4 Stück', 24],
    ['-0', -0],
    ['.', null],
    ['.a', null],
    ['.a02', 0.02],
  ])('parses "%s" as "%s"', async (string, expected) => {
    const wrapper = mount()
    const input = wrapper.find('input')

    input.element.value = string
    await input.trigger('input')

    expect(wrapper.vm.data).toBe(expected)
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
