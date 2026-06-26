// Serialization between the storyboard API data structure and the HTML
// representation used by the unified TipTap editor (idea #6).
//
// The TipTap document is a sequence of "storyboard section" blocks. Each block
// is rendered as a <div data-storyboard-section> whose data-attributes hold the
// non-program columns (time/responsible/material/comment) and whose inner HTML
// is the program content (column2Html). This keeps a single, continuous editing
// surface while still serializing into the API's `sections` map.

export function generateSectionId() {
  return generateId()
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Non-cryptographic fallback, only used to key storyboard sections.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function escapeAttribute(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sortedSectionEntries(sections) {
  return Object.entries(sections).sort(
    ([keyA, a], [keyB, b]) => a.position - b.position || keyA.localeCompare(keyB)
  )
}

/**
 * Convert the API `sections` map into the HTML the TipTap editor loads.
 */
export function sectionsToHtml(sections) {
  return sortedSectionEntries(sections)
    .map(([id, section]) => {
      const program = section.column2Html?.trim() ? section.column2Html : '<p></p>'
      return (
        `<div data-storyboard-section` +
        ` data-section-id="${escapeAttribute(id)}"` +
        ` data-time="${escapeAttribute(section.column1)}"` +
        ` data-responsible="${escapeAttribute(section.column3)}"` +
        ` data-material="${escapeAttribute(section.column4)}"` +
        ` data-comment="${escapeAttribute(section.comment)}">` +
        `${program}</div>`
      )
    })
    .join('')
}

/**
 * Parse the TipTap editor HTML back into an API `sections` map. Section ids are
 * preserved from the data-section-id attribute (or generated when missing), and
 * positions are derived from document order.
 *
 * @param {string} html
 * @param {(html: string) => Element[]} [parseElements] inject a parser in
 *   environments without DOMParser; defaults to the browser/jsdom DOMParser.
 */
export function htmlToSections(html, parseElements = defaultParseElements) {
  const elements = parseElements(html)
  const sections = {}
  elements.forEach((element, index) => {
    const id = element.getAttribute('data-section-id') || generateId()
    sections[id] = {
      column1: element.getAttribute('data-time') ?? '',
      column2Html: element.innerHTML ?? '',
      column3: element.getAttribute('data-responsible') ?? '',
      column4: element.getAttribute('data-material') ?? '',
      comment: element.getAttribute('data-comment') ?? '',
      position: index,
    }
  })
  return sections
}

function defaultParseElements(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  return Array.from(doc.querySelectorAll('[data-storyboard-section]'))
}
