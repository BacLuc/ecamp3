<template>
  <div class="e-storyboard-continuous">
    <div v-if="!disabled" class="e-storyboard-continuous__toolbar px-3 pt-2 d-flex ga-1">
      <v-btn
        size="small"
        variant="text"
        :class="{ 'v-btn--active': isActive('bold') }"
        icon="mdi-format-bold"
        @click="run((c) => c.toggleBold())"
      />
      <v-btn
        size="small"
        variant="text"
        :class="{ 'v-btn--active': isActive('italic') }"
        icon="mdi-format-italic"
        @click="run((c) => c.toggleItalic())"
      />
      <v-btn
        size="small"
        variant="text"
        :class="{ 'v-btn--active': isActive('bulletList') }"
        icon="mdi-format-list-bulleted"
        @click="run((c) => c.toggleBulletList())"
      />
    </div>
    <editor-content
      v-if="editor"
      :editor="editor"
      class="e-storyboard-continuous__content px-3 pb-3"
    />
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-3'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import HardBreak from '@tiptap/extension-hard-break'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import History from '@tiptap/extension-history'
import Placeholder from '@tiptap/extension-placeholder'
import { debounce } from 'lodash-es'
import { useToast } from 'vue-toastification'
import { errorToMultiLineToast } from '@/components/toast/toasts'
import { StoryboardParagraph } from './tiptap/StoryboardParagraph.js'
import {
  sectionsToHtml,
  htmlToSections,
} from '@/common/helpers/storyboardSerialization.js'

export default {
  name: 'StoryboardContinuousEditor',
  components: { EditorContent },
  props: {
    contentNode: { type: Object, required: true },
    disabled: { type: Boolean, default: false },
  },
  setup() {
    return { toast: useToast() }
  },
  data() {
    return {
      editor: null,
      previousSections: {},
    }
  },
  computed: {
    sections() {
      const sections = this.contentNode.data.sections
      if (Array.isArray(sections) && sections.length === 0) {
        return {}
      }
      return sections
    },
  },
  mounted() {
    const initial = Object.keys(this.sections).length
      ? sectionsToHtml(this.sections)
      : '<p></p>'

    this.debouncedSave = debounce(this.save, 800)
    this.editor = new Editor({
      editable: !this.disabled,
      content: initial,
      extensions: [
        Document,
        StoryboardParagraph,
        Text,
        Bold,
        Italic,
        Underline,
        Strike,
        ListItem,
        BulletList,
        OrderedList,
        HardBreak,
        History,
        Placeholder.configure({
          placeholder: () =>
            this.$t('contentNode.storyboard.entity.section.fields.column2Html'),
        }),
      ],
      onUpdate: () => this.debouncedSave(),
    })
    this.previousSections = htmlToSections(this.editor.getHTML())
  },
  beforeUnmount() {
    this.debouncedSave?.cancel()
    this.editor?.destroy()
  },
  methods: {
    isActive(name) {
      return this.editor?.isActive(name) ?? false
    },
    run(commandFn) {
      commandFn(this.editor.chain().focus()).run()
    },
    async save() {
      const newSections = htmlToSections(this.editor.getHTML())

      // Build a merge-patch: changed/added sections plus null for removed ones.
      const payload = { ...newSections }
      Object.keys(this.previousSections).forEach((id) => {
        if (!(id in newSections)) {
          payload[id] = null
        }
      })
      this.previousSections = newSections

      try {
        await this.contentNode.$patch({ data: { sections: payload } })
      } catch (error) {
        this.toast.error(errorToMultiLineToast(error))
      }
    },
  },
}
</script>

<style scoped lang="scss">
.e-storyboard-continuous__content:deep(.ProseMirror) {
  outline: none;
}
.e-storyboard-continuous__content:deep(.ProseMirror p) {
  margin: 0;
}
// Hide the time gutter for paragraphs nested inside list items.
.e-storyboard-continuous__content:deep(li .e-sb-para__time) {
  display: none;
}
.e-storyboard-continuous__content:deep(.is-empty::before) {
  content: attr(data-placeholder);
  color: #8b8b8b;
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
