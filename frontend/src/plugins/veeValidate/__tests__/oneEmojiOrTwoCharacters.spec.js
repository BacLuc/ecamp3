import { describe, expect, it } from 'vitest'
import oneEmojiOrTwoCharacters from '../oneEmojiOrTwoCharacters.js'
import mockI18n from './mockI18n.js'

const validationMessageKey = 'global.validation.oneEmojiOrTwoCharacters'

describe('oneEmojiOrTwoCharacters validation', () => {
  it.each([
    ['1', true],
    ['12', true],
    ['123', validationMessageKey],
    ['🧑🏼‍🔧', true],
    ['🧑🏼‍🔧😊', validationMessageKey],
    ['😊', true],
    ['😊😊', validationMessageKey],
    ['a😊', validationMessageKey],
    ['', true],
    ['😊😊😊😊', validationMessageKey],
  ])('validates %s as %s', (input, expected) => {
    // given
    const rule = oneEmojiOrTwoCharacters(mockI18n)

    // when
    const result = rule(input, [], { label: 'Field' })

    // then
    expect(result).toBe(expected)
  })
})
