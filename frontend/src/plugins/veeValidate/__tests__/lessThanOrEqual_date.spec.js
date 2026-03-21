import { beforeEach, describe, expect, it } from 'vitest'
import lessThanOrEqual_date from '../lessThanOrEqual_date.js'
import dayjs from '@/common/helpers/dayjs.js'
import mockI18n from './mockI18n.js'

const validationMessageKey = 'global.validation.lessThanOrEqual_date'

describe('lessThanOrEqual_date validation', () => {
  describe('german', () => {
    beforeEach(() => {
      dayjs.locale('de')
    })

    it.each([
      [['18.01.2020', '19.01.2020'], true],
      [['19.01.2020', '19.01.2020'], true],
      [['20.01.2020', '19.01.2020'], validationMessageKey],
      [['', '19.01.2020'], validationMessageKey],
      [['2.1.2020', '02.01.2020'], validationMessageKey], // invalid date
      [['3.1.2020', '02.01.2020'], validationMessageKey], // invalid date
      [['today', '02.01.2020'], validationMessageKey], // invalid date
    ])('validates %p as %p', (input, expected) => {
      // given
      const rule = lessThanOrEqual_date(dayjs, mockI18n)

      // when
      const [value, max] = input
      const result = rule(value, [max], { label: 'Field' })

      // then
      expect(result).toBe(expected)
    })
  })
  describe('english', () => {
    beforeEach(() => {
      dayjs.locale('en')
    })

    it.each([
      [['01/18/2020', '01/19/2020'], true],
      [['01/19/2020', '01/19/2020'], true],
      [['01/20/2020', '01/19/2020'], validationMessageKey],
      [['', '01/19/2020'], validationMessageKey],
      [['1/2/2020', '01/02/2020'], validationMessageKey], // invalid date
      [['1/3/2020', '01/02/2020'], validationMessageKey], // invalid date
      [['today', '01/02/2020'], validationMessageKey], // invalid date
    ])('validates %p as %p', (input, expected) => {
      // given
      const rule = lessThanOrEqual_date(dayjs, mockI18n)

      // when
      const [value, max] = input
      const result = rule(value, [max], { label: 'Field' })

      // then
      expect(result).toBe(expected)
    })
  })
})
