import { describe, expect, it } from 'vitest'
import { toWorkbook } from '@/components/material/useMaterialViewHelper.js'

describe('toWorkBook', () => {
  it('replaces invalid characters', () => {
    const sheets = createSheets('s?h*e[]e/t:1:')

    const workbook = toWorkbook(sheets)

    expect(workbook.SheetNames).toEqual(['sheet1'])
  })

  it('shortens sheets names with more than 31 characters', () => {
    const sheetName = 'a'.repeat(32)
    const sheets = createSheets(sheetName)

    const workbook = toWorkbook(sheets)

    expect(workbook.SheetNames).toEqual([sheetName.slice(0, 31)])
  })

  it('does not overwrite sheets when shortening them makes them not unique anymore', () => {
    const sheets = [
      ...createSheets('a'.repeat(32)),
      ...createSheets('a'.repeat(33)),
      ...createSheets('a'.repeat(34)),
    ]
    const workbook = toWorkbook(sheets)

    expect(Object.entries(workbook.Sheets)).toHaveLength(sheets.length)
    expect(workbook.SheetNames.filter((name) => name.length > 31)).toEqual([])
  })

  it('does not overwrite sheets when they have the same name', () => {
    const sheets = [...createSheets('sheet1'), ...createSheets('sheet1')]
    const workbook = toWorkbook(sheets)

    expect(Object.entries(workbook.Sheets)).toHaveLength(sheets.length)
  })
})

const data = [['row1']]

function createSheets(sheetName) {
  return [
    {
      sheetName: sheetName,
      data,
    },
  ]
}
