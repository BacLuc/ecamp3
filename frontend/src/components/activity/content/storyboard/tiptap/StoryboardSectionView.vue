<template>
  <node-view-wrapper
    class="e-sb-section"
    :class="{ 'e-sb-section--readonly': !editable }"
  >
    <div class="e-sb-section__time" contenteditable="false">
      <input
        :value="node.attrs.time"
        :readonly="!editable"
        :placeholder="$t('contentNode.storyboard.entity.section.fields.column1')"
        class="e-sb-section__input e-sb-section__input--time"
        @input="updateAttributes({ time: $event.target.value })"
        @blur="updateAttributes({ time: parseTime($event.target.value) })"
      />
    </div>
    <node-view-content class="e-sb-section__program" />
    <div class="e-sb-section__responsible" contenteditable="false">
      <input
        :value="node.attrs.responsible"
        :readonly="!editable"
        :placeholder="$t('contentNode.storyboard.entity.section.fields.column3')"
        class="e-sb-section__input"
        @input="updateAttributes({ responsible: $event.target.value })"
      />
    </div>
  </node-view-wrapper>
</template>

<script>
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'
import { formatStoryboardTime } from '@/common/helpers/storyboardTime.js'

export default {
  name: 'StoryboardSectionView',
  components: { NodeViewWrapper, NodeViewContent },
  props: nodeViewProps,
  computed: {
    editable() {
      return this.editor.isEditable
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
.e-sb-section {
  display: grid;
  grid-template-columns: 5.5rem 1fr 9rem;
  gap: 0.5rem;
  align-items: start;
  padding: 0.35rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.e-sb-section__input {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  font: inherit;

  &:focus {
    border-bottom: 1px solid rgb(var(--v-theme-primary));
  }
}

.e-sb-section__input--time {
  font-variant-numeric: tabular-nums;
}

.e-sb-section__program {
  min-width: 0;
}
</style>
