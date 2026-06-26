import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import StoryboardSectionView from './StoryboardSectionView.vue'

// A storyboard section is a block that contains the rich program content and
// carries the other columns (time/responsible/material/comment) as attributes.
// Its HTML representation matches common/helpers/storyboardSerialization.js, so
// editor.getHTML() round-trips into the API `sections` structure.
function dataAttribute(name, htmlAttribute) {
  return {
    default: name === 'sectionId' ? null : '',
    parseHTML: (element) =>
      element.getAttribute(htmlAttribute) ?? (name === 'sectionId' ? null : ''),
    renderHTML: (attributes) => {
      const value = attributes[name]
      if (value === null || value === undefined || value === '') {
        return name === 'sectionId' ? {} : { [htmlAttribute]: '' }
      }
      return { [htmlAttribute]: value }
    },
  }
}

export const StoryboardSection = Node.create({
  name: 'storyboardSection',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      sectionId: dataAttribute('sectionId', 'data-section-id'),
      time: dataAttribute('time', 'data-time'),
      responsible: dataAttribute('responsible', 'data-responsible'),
      material: dataAttribute('material', 'data-material'),
      comment: dataAttribute('comment', 'data-comment'),
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-storyboard-section]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-storyboard-section': '' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(StoryboardSectionView)
  },
})
