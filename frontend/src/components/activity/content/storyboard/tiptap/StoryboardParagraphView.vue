<template>
  <node-view-wrapper class="e-sb-para" :class="{ 'e-sb-para--top': isTopLevel }" as="div">
    <div v-if="isTopLevel" class="e-sb-para__time" contenteditable="false">
      <input
        :value="node.attrs.time"
        :readonly="!editable"
        :placeholder="$t('contentNode.storyboard.entity.section.fields.column1')"
        class="e-sb-para__time-input"
        @input="updateAttributes({ time: $event.target.value })"
        @blur="updateAttributes({ time: parseTime($event.target.value) })"
      />
    </div>
    <node-view-content class="e-sb-para__text" as="div" />
  </node-view-wrapper>
</template>

<script>
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'
import { formatStoryboardTime } from '@/common/helpers/storyboardTime.js'

export default {
  name: 'StoryboardParagraphView',
  components: { NodeViewWrapper, NodeViewContent },
  props: nodeViewProps,
  computed: {
    editable() {
      return this.editor.isEditable
    },
    // The time gutter is only shown for top-level paragraphs; paragraphs nested
    // inside list items must not start sections.
    isTopLevel() {
      if (typeof this.getPos !== 'function') return true
      const pos = this.getPos()
      if (pos === undefined || pos === null) return true
      try {
        return this.editor.state.doc.resolve(pos).depth === 0
      } catch {
        return true
      }
    },
  },
  methods: {
    parseTime(value) {
      return formatStoryboardTime(value)
    },
  },
}
</script>

<style scoped lang="scss">
.e-sb-para {
  display: block;
}

.e-sb-para--top {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.5rem;
  align-items: baseline;
  padding: 0.15rem 0;
}

.e-sb-para__time-input {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  font: inherit;
  font-variant-numeric: tabular-nums;

  &:focus {
    border-bottom: 1px solid rgb(var(--v-theme-primary));
  }
}

.e-sb-para__text {
  min-width: 0;
}
</style>
