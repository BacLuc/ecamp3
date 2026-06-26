import { describe, expect, it } from 'vitest'
import { formatStoryboardTime } from '../storyboardTime.js'

describe('formatStoryboardTime', () => {
  it.each([
    ['9', '09:00'],
    ['09', '09:00'],
    ['9h', '09:00'],
    ['23', '23:00'],
    ['0900', '09:00'],
    ['930', '09:30'],
    ['1830', '18:30'],
    ['9:00', '09:00'],
    ['9:5', '9:5'], // single minute digit is not understood -> untouched
    ['9.30', '09:30'],
    ['9h30', '09:30'],
    ['  9:00  ', '09:00'], // trimmed
  ])('normalizes single value %j to %j', (input, expected) => {
    expect(formatStoryboardTime(input)).toBe(expected)
  })

  it.each([
    ['9-10', '09:00–10:00'],
    ['9:00 - 10:30', '09:00–10:30'],
    ['930-1030', '09:30–10:30'],
    ['9–10', '09:00–10:00'],
  ])('normalizes range %j to %j', (input, expected) => {
    expect(formatStoryboardTime(input)).toBe(expected)
  })

  it.each([
    ['after lunch'],
    ['ca. 9h'],
    ['25:00'], // invalid hour
    ['9:99'], // invalid minute
    ['9 - lunch'], // one side not parseable
    [''],
  ])('leaves custom value %j untouched', (input) => {
    expect(formatStoryboardTime(input)).toBe(input)
  })

  it('returns non-string input unchanged', () => {
    expect(formatStoryboardTime(undefined)).toBe(undefined)
    expect(formatStoryboardTime(null)).toBe(null)
  })
})
