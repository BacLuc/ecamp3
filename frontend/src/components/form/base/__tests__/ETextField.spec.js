import { describe, expect, test } from 'vitest'
import { mount as mountComponent } from '@vue/test-utils'
import ETextField from '../ETextField.vue'
import { screen } from '@testing-library/vue'
import { setupVuetify } from '/tests/setupVuetify.js'

setupVuetify()

describe('An ETextField', () => {
  const mount = (options) => {
    const app = {
      components: { ETextField },
      data: function () {
        return {
          data: null,
        }
      },
      template: `
        <div data-app>
          <e-text-field label="test" v-model="data">
            ${options?.children}
          </e-text-field>
        </div>
      `,
    }
    return mountComponent(app, { attachTo: document.body, ...options })
  }

  test('looks like a textfield', async () => {
    const wrapper = mount()
    expect(wrapper.html()).toMatchSnapshot('empty')

    await wrapper.setData({ data: 'MyText' })
    expect(wrapper.html()).toMatchSnapshot('with text')
  })

  test('updates text when vModel changes', async () => {
    const wrapper = mount()
    expect(wrapper.find('input[type=text]').element.value).toBe('')

    const firstText = 'myText'
    await wrapper.setData({ data: firstText })
    expect(wrapper.find('input[type=text]').element.value).toBe(firstText)

    const secondText = 'myText2'
    await wrapper.setData({ data: secondText })
    expect(wrapper.find('input[type=text]').element.value).toBe(secondText)
  })

  test('updates vModel when value of input field changes', async () => {
    const wrapper = mount()
    const input = wrapper.find('input')
    const text = 'bla'

    input.element.value = text
    await input.trigger('input')

    expect(wrapper.vm.data).toBe(text)
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
