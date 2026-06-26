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
  it('serializes sections to time-carrying paragraphs in position order', () => {
    const html = sectionsToHtml(sections)
    // section with position 0 (Bob/10:00) comes first
    expect(html.indexOf('Game')).toBeLessThan(html.indexOf('Welcome'))
    expect(html).toContain('data-time="10:00"')
    expect(html).toContain('data-responsible="Alice"')
    expect(html).toContain('data-section-id="aaaaaaaa-0000-4000-8000-000000000002"')
  })

  it('round-trips sections through html (ids, columns and order preserved)', () => {
    const parsed = htmlToSections(sectionsToHtml(sections))

    expect(Object.keys(parsed).sort()).toEqual(Object.keys(sections).sort())
    expect(parsed['aaaaaaaa-0000-4000-8000-000000000002']).toEqual({
      column1: '10:00',
      column2Html: '<p>Game</p>',
      column3: 'Bob',
      column4: '',
      comment: '',
      position: 0,
    })
    expect(parsed['aaaaaaaa-0000-4000-8000-000000000001']).toEqual({
      column1: '09:00',
      column2Html: '<p>Welcome</p>',
      column3: 'Alice',
      column4: 'Rope',
      comment: 'bring sunscreen',
      position: 1,
    })
  })

  it('groups untimed blocks below a time into the same section', () => {
    const html =
      '<p data-time="09:00">Intro</p>' +
      '<p>still nine</p>' +
      '<ul><li>a point</li></ul>' +
      '<p data-time="10:30">Later</p>'
    const parsed = htmlToSections(html)
    const ordered = Object.values(parsed).sort((a, b) => a.position - b.position)

    expect(ordered).toHaveLength(2)
    expect(ordered[0].column1).toBe('09:00')
    expect(ordered[0].column2Html).toBe('<p>Intro</p><p>still nine</p><ul><li>a point</li></ul>')
    expect(ordered[1].column1).toBe('10:30')
    expect(ordered[1].column2Html).toBe('<p>Later</p>')
  })

  it('starts a first section even without a leading time', () => {
    const parsed = htmlToSections('<p>no time here</p><p data-time="11:00">timed</p>')
    const ordered = Object.values(parsed).sort((a, b) => a.position - b.position)

    expect(ordered).toHaveLength(2)
    expect(ordered[0].column1).toBe('')
    expect(ordered[0].column2Html).toBe('<p>no time here</p>')
    expect(ordered[1].column1).toBe('11:00')
  })

  it('strips meta attributes from the stored program html', () => {
    const parsed = htmlToSections(
      '<p data-section-id="x" data-time="08:00" data-responsible="Carol">Hi</p>'
    )
    expect(parsed.x.column2Html).toBe('<p>Hi</p>')
    expect(parsed.x.column3).toBe('Carol')
  })

  it('generates an id when data-section-id is missing', () => {
    const parsed = htmlToSections('<p data-time="08:00">Hi</p>')
    const keys = Object.keys(parsed)
    expect(keys).toHaveLength(1)
    expect(keys[0]).toMatch(/[0-9a-f-]{36}/)
  })
})
