import { beforeEach, describe, expect, it } from 'vitest'
import greaterThan_time from '../greaterThan_time.js'
import dayjs from '@/common/helpers/dayjs.js'
import mockI18n from './mockI18n.js'

const validationMessageKey = 'global.validation.greaterThan_time'

describe('greaterThan_time validation', () => {
  const testcases = {
    de: [
      [['09:31', '09:30'], true],
      [['09:30', '09:30'], validationMessageKey],
      [['09:29', '09:30'], validationMessageKey],
      [['', '09:30'], validationMessageKey],
      [['9:31 AM', '09:30'], true], // dayjs parser is somewhat forgiving here
      [['9:31', '09:30'], true],
      [['9:30', '09:30'], validationMessageKey],
      [['9:29', '09:30'], validationMessageKey],
      [['now', '09:30'], validationMessageKey], // invalid date
    ],
    en: [
      [['09:31 AM', '09:30 AM'], true],
      [['09:30 AM', '09:30 AM'], validationMessageKey],
      [['09:29 AM', '09:30 AM'], validationMessageKey],
      [['', '09:30 AM'], validationMessageKey],
      [['09:30', '09:30 AM'], validationMessageKey], // wrong format
      [['9:31', '09:30 AM'], validationMessageKey], // wrong format
      [['now', '09:30 AM'], validationMessageKey], // invalid date
    ],
  }

  describe.each(Object.entries(testcases))('%s', (language, cases) => {
    beforeEach(() => {
      dayjs.locale(language)
    })

    describe('when min is a string', () => {
      it.each(cases)('validates %p as %p', (input, expected) => {
        // given
        const rule = greaterThan_time(dayjs, mockI18n)

        // when
        const [value, min] = input
        const result = rule(value, [min], { label: 'Field' })

        // then
        expect(result).toBe(expected)
      })
    })

    describe('when min is a dayjs object', () => {
      const casesWithDayjsObjectsAsMin = cases.map(([[input, minStr], expected]) => {
        dayjs.locale(language)
        const minObj = dayjs.utc('2022-09-03 ' + minStr, 'YYYY-MM-DD LT')
        return [[input, minObj], expected]
      })

      it.each(casesWithDayjsObjectsAsMin)('validates %p as %p', (input, expected) => {
        // given
        const rule = greaterThan_time(dayjs, mockI18n)

        // when
        const [value, min] = input
        const result = rule(value, [min], { label: 'Field' })

        // then
        expect(result).toBe(expected)
      })
    })
  })
})
