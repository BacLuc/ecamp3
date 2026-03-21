import { describe, expect, test } from 'vitest'
import { mount as mountComponent } from '@vue/test-utils'
import ETextarea from '../ETextarea.vue'
import { mockEventClass } from '@/test/mockEventClass'
import { setupVuetify } from '/tests/setupVuetify.js'

mockEventClass('ClipboardEvent')
mockEventClass('DragEvent')

setupVuetify()

describe('An ETextArea', () => {
  const multiLineText = `
    Here comes a text
    with new lines
    and new lines with \n in them
    and tags <i>a</i>
    `

  const mount = (
    options,
    template = `
        <div data-app>
          <e-textarea label="test" v-model="data"/>
        </div>
      `
  ) => {
    const app = {
      components: { ETextarea },
      data: () => ({ data: null }),
      template: template,
    }
    return mountComponent(app, { attachTo: document.body, ...options })
  }

  test('looks like a textarea', async () => {
    const wrapper = mount()
    expect(wrapper.html()).toMatchSnapshot('notext')

    await wrapper.setData({ data: multiLineText })
    expect(wrapper.html()).toMatchSnapshot('withtext')
  })

  test('updates the text with the viewmodel', async () => {
    const wrapper = mount()
    await wrapper.setData({ data: multiLineText })
    const textWithoutMultiLine = multiLineText
      .replace(/\n\s*/g, ' ')
      .replace('  ', ' ')
      .replace('<i>', '')
      .replace('</i>', '')
      .trim()
    expect(wrapper.find('.editor__content').text()).toBe(textWithoutMultiLine)
    expect(wrapper.vm.data).toBe(multiLineText)
  })
})
