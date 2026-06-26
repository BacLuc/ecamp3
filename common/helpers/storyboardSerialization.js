// Serialization between the storyboard API data structure and the HTML of the
// unified TipTap editor (idea #6).
//
// The editor is a single continuous document of blocks (paragraphs, lists, …).
// A time entered in the left gutter of a top-level paragraph starts a new
// "section": that paragraph and every following block (until the next timed
// paragraph) make up the section's program content. The first block always
// starts a section, even without a time.
//
// The time (and the other per-section columns, preserved but not edited here)
// live as data-attributes on the first paragraph of each section:
//   <p data-section-id data-time data-responsible data-material data-comment>
// so editor.getHTML() round-trips into the API `sections` map.

const META_ATTRIBUTES = [
  'data-section-id',
  'data-time',
  'data-responsible',
  'data-material',
  'data-comment',
]

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

export function generateSectionId() {
  return generateId()
}

function sortedSectionEntries(sections) {
  return Object.entries(sections).sort(
    ([keyA, a], [keyB, b]) => a.position - b.position || keyA.localeCompare(keyB)
  )
}

function parseDocument(html) {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
}

/**
 * Convert the API `sections` map into the HTML the TipTap editor loads. The
 * section's metadata is attached to the first block of its program content.
 */
export function sectionsToHtml(sections) {
  const doc = parseDocument('')
  const container = doc.body

  sortedSectionEntries(sections).forEach(([id, section]) => {
    const fragment = doc.createElement('div')
    fragment.innerHTML = section.column2Html?.trim() ? section.column2Html : '<p></p>'

    let first = fragment.firstElementChild
    if (!first) {
      first = doc.createElement('p')
      first.innerHTML = fragment.innerHTML
      fragment.innerHTML = ''
      fragment.appendChild(first)
    }

    first.setAttribute('data-section-id', id)
    first.setAttribute('data-time', section.column1 ?? '')
    if (section.column3) first.setAttribute('data-responsible', section.column3)
    if (section.column4) first.setAttribute('data-material', section.column4)
    if (section.comment) first.setAttribute('data-comment', section.comment)

    while (fragment.firstChild) {
      container.appendChild(fragment.firstChild)
    }
  })

  return container.innerHTML
}

function cleanBlockHtml(element) {
  const clone = element.cloneNode(true)
  META_ATTRIBUTES.forEach((attribute) => clone.removeAttribute(attribute))
  return clone.outerHTML
}

/**
 * Parse the TipTap editor HTML back into an API `sections` map. A new section
 * begins at the first block and at every top-level paragraph carrying a
 * non-empty time; in-between blocks are appended to the current section's
 * program. Section ids are preserved from data-section-id when present.
 *
 * @param {string} html
 * @param {(html: string) => Element[]} [parseElements] inject a parser in
 *   environments without DOMParser; defaults to the browser/jsdom DOMParser.
 */
export function htmlToSections(html, parseElements = defaultParseElements) {
  const elements = parseElements(html)
  const sections = {}
  let current = null
  let position = 0

  elements.forEach((element) => {
    const isParagraph = element.tagName === 'P'
    const time = isParagraph ? element.getAttribute('data-time') || '' : ''
    const startsNewSection = current === null || time !== ''

    if (startsNewSection) {
      const id = element.getAttribute('data-section-id') || generateId()
      current = {
        column1: time,
        column2Html: '',
        column3: isParagraph ? element.getAttribute('data-responsible') || '' : '',
        column4: isParagraph ? element.getAttribute('data-material') || '' : '',
        comment: isParagraph ? element.getAttribute('data-comment') || '' : '',
        position: position++,
      }
      sections[id] = current
    }

    current.column2Html += cleanBlockHtml(element)
  })

  return sections
}

function defaultParseElements(html) {
  return Array.from(parseDocument(html).body.children)
}
