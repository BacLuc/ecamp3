import Paragraph from '@tiptap/extension-paragraph'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import StoryboardParagraphView from './StoryboardParagraphView.vue'

// Renders a data-attribute only when the value is non-empty, so continuation
// paragraphs (no time) stay clean and never act as section boundaries.
function metaAttribute(htmlAttribute) {
  return {
    default: '',
    parseHTML: (element) => element.getAttribute(htmlAttribute) || '',
    renderHTML: (attributes, name) =>
      attributes[name] ? { [htmlAttribute]: attributes[name] } : {},
  }
}

// Paragraph extended so that a time (and the preserved responsible/material/
// comment columns) can be anchored to it. A top-level paragraph with a time
// starts a storyboard section; see common/helpers/storyboardSerialization.js.
export const StoryboardParagraph = Paragraph.extend({
  addAttributes() {
    const time = metaAttribute('data-time')
    const responsible = metaAttribute('data-responsible')
    const material = metaAttribute('data-material')
    const comment = metaAttribute('data-comment')
    return {
      ...this.parent?.(),
      time: {
        default: '',
        parseHTML: time.parseHTML,
        renderHTML: (attributes) => time.renderHTML(attributes, 'time'),
      },
      responsible: {
        default: '',
        parseHTML: responsible.parseHTML,
        renderHTML: (attributes) => responsible.renderHTML(attributes, 'responsible'),
      },
      material: {
        default: '',
        parseHTML: material.parseHTML,
        renderHTML: (attributes) => material.renderHTML(attributes, 'material'),
      },
      comment: {
        default: '',
        parseHTML: comment.parseHTML,
        renderHTML: (attributes) => comment.renderHTML(attributes, 'comment'),
      },
      sectionId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-section-id'),
        renderHTML: (attributes) =>
          attributes.sectionId ? { 'data-section-id': attributes.sectionId } : {},
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Splitting a top-level paragraph must not carry the time (and the other
      // per-section metadata) into the new paragraph, otherwise every new line
      // would start its own section. The new paragraph becomes a plain
      // continuation; add a time in its gutter to start a section.
      Enter: () => {
        const { $from } = this.editor.state.selection
        if ($from.parent.type.name !== this.name || $from.depth !== 1) {
          // Not a top-level paragraph (e.g. inside a list); let others handle it.
          return false
        }
        return this.editor
          .chain()
          .splitBlock()
          .command(({ commands }) =>
            commands.updateAttributes(this.name, {
              time: '',
              sectionId: null,
              responsible: '',
              material: '',
              comment: '',
            })
          )
          .run()
      },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(StoryboardParagraphView)
  },
})
