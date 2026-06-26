import { describe, expect, it } from 'vitest'
import { sectionsToHtml, htmlToSections } from '../storyboardSerialization.js'

const sections = {
  'aaaaaaaa-0000-4000-8000-000000000001': {
    column1: '09:00',
    column2Html: '<p>Welcome</p>',
    column3: 'Alice',
    column4: 'Rope',
    comment: 'bring sunscreen',
    position: 1,
  },
  'aaaaaaaa-0000-4000-8000-000000000002': {
    column1: '10:00',
    column2Html: '<p>Game</p>',
    column3: 'Bob',
    column4: '',
    comment: '',
    position: 0,
  },
}

describe('storyboard serialization', () => {
  it('serializes sections to html in position order', () => {
    const html = sectionsToHtml(sections)
    // section with position 0 (Bob) comes first
    expect(html.indexOf('Bob')).toBeLessThan(html.indexOf('Alice'))
    expect(html).toContain('data-time="10:00"')
    expect(html).toContain('data-section-id="aaaaaaaa-0000-4000-8000-000000000002"')
  })

  it('escapes attribute values', () => {
    const html = sectionsToHtml({
      id1: {
        column1: '',
        column2Html: '<p>x</p>',
        column3: 'A & "B" <c>',
        column4: '',
        comment: '',
        position: 0,
      },
    })
    expect(html).toContain('data-responsible="A &amp; &quot;B&quot; &lt;c&gt;"')
  })

  it('round-trips sections through html (ids and content preserved)', () => {
    const html = sectionsToHtml(sections)
    const parsed = htmlToSections(html)

    expect(Object.keys(parsed).sort()).toEqual(Object.keys(sections).sort())
    const first = parsed['aaaaaaaa-0000-4000-8000-000000000002']
    expect(first).toMatchObject({
      column1: '10:00',
      column2Html: '<p>Game</p>',
      column3: 'Bob',
      column4: '',
      comment: '',
      position: 0,
    })
    const second = parsed['aaaaaaaa-0000-4000-8000-000000000001']
    expect(second).toMatchObject({
      column1: '09:00',
      column3: 'Alice',
      column4: 'Rope',
      comment: 'bring sunscreen',
      position: 1,
    })
  })

  it('generates an id when data-section-id is missing', () => {
    const parsed = htmlToSections(
      '<div data-storyboard-section data-time="08:00"><p>Hi</p></div>'
    )
    const keys = Object.keys(parsed)
    expect(keys).toHaveLength(1)
    expect(keys[0]).toMatch(/[0-9a-f-]{36}/)
    expect(parsed[keys[0]].column1).toBe('08:00')
  })
})
