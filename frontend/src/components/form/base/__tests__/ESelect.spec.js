import { describe, expect, test } from 'vitest'
import { mount as mountComponent } from '@vue/test-utils'
import ESelect from '../ESelect.vue'
import { screen } from '@testing-library/vue'
import { setupVuetify } from '/tests/setupVuetify.js'

setupVuetify()

describe('An ESelect', () => {
  const FIRST_OPTION = {
    value: 1,
    text: 'firstOption',
  }
  const SECOND_OPTION = {
    value: '2',
    text: 'secondOption',
  }
  const THIRD_OPTION = {
    value: { key: 'value', array: [1, 2, 3], nestedObject: { key: 'value' } },
    text: 'thirdOption',
  }
  const selectValues = [FIRST_OPTION, SECOND_OPTION, THIRD_OPTION]

  const mount = (options) => {
    const app = {
      components: { ESelect },
      data: function () {
        return {
          selectValues: selectValues,
          data: null,
        }
      },
      template: `
        <div data-app>
          <e-select label="test" :items="selectValues" v-model="data">
            ${options?.children}
          </e-select>
        </div>
      `,
    }
    return mountComponent(app, { attachTo: document.body, ...options })
  }

  test('update selected value with viewmodel', async () => {
    const wrapper = mount()

    await wrapper.setData({ data: SECOND_OPTION.value })
    expect(wrapper.html()).toContain(SECOND_OPTION.text)
    expect(wrapper.html()).not.toContain(FIRST_OPTION.text)

    await wrapper.setData({ data: FIRST_OPTION.value })
    expect(wrapper.html()).toContain(FIRST_OPTION.text)
    expect(wrapper.html()).not.toContain(SECOND_OPTION.text)
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
