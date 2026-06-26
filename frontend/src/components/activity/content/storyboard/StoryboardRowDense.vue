<template>
  <div
    role="row"
    class="e-storyboard-row e-storyboard-row--dense"
    :class="{ 'e-storyboard-row--dimmed': dimmed }"
    :style="gridStyle"
  >
    <div v-if="!layoutMode" role="cell" class="e-storyboard-row__handle">
      <v-btn
        icon="mdi-drag"
        size="small"
        class="drag-and-drop-handle"
        :disabled="isLastSection"
        variant="flat"
        density="comfortable"
        :aria-label="$t('global.button.move')"
        @keydown.down="$emit('moveDown', itemKey)"
        @keydown.up="$emit('moveUp', itemKey)"
      >
        <v-icon icon="mdi-drag" size="24" />
      </v-btn>
    </div>
    <div v-if="showTime" role="cell" class="e-storyboard-row__time">
      <api-text-field
        :label="$t('contentNode.storyboard.entity.section.fields.column1')"
        :single-line="false"
        :path="`data.sections[${itemKey}].column1`"
        :parse="parseTime ? formatStoryboardTime : null"
        :disabled="layoutMode || disabled"
      />
    </div>
    <div v-if="showResponsible" role="cell" class="e-storyboard-row__responsible">
      <api-text-field
        :label="$t('contentNode.storyboard.entity.section.fields.column3')"
        :single-line="false"
        :path="`data.sections[${itemKey}].column3`"
        :disabled="layoutMode || disabled"
      />
    </div>
    <div v-if="showMaterials" role="cell" class="e-storyboard-row__materials">
      <api-text-field
        :label="$t('contentNode.storyboard.entity.section.fields.column4')"
        :single-line="false"
        :path="`data.sections[${itemKey}].column4`"
        :disabled="layoutMode || disabled"
      />
    </div>
    <div role="cell" class="e-storyboard-row__text">
      <api-richtext
        :label="$t('contentNode.storyboard.entity.section.fields.column2Html')"
        :path="`data.sections[${itemKey}].column2Html`"
        rows="4"
        :disabled="layoutMode || disabled"
      />
    </div>
    <div v-if="showComment" role="cell" class="e-storyboard-row__comment">
      <api-textarea
        :label="$t('contentNode.storyboard.entity.section.fields.comment')"
        :path="`data.sections[${itemKey}].comment`"
        rows="2"
        auto-grow
        :disabled="layoutMode || disabled"
      />
    </div>
    <div v-if="!layoutMode && !disabled" role="cell" class="e-storyboard-row__controls">
      <v-btn
        variant="text"
        size="small"
        density="comfortable"
        :color="showComment ? 'primary' : undefined"
        :aria-label="$t('components.activity.content.storyboard.toggleComment')"
        :title="$t('components.activity.content.storyboard.toggleComment')"
        @click="toggleComment"
      >
        <v-icon
          :icon="hasComment ? 'mdi-comment-text-outline' : 'mdi-comment-plus-outline'"
          size="24"
        />
      </v-btn>
      <dialog-remove-section @submit="$emit('delete', itemKey)">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            density="comfortable"
            class="e-storyboard-row__delete"
            color="error"
            :disabled="isLastSection"
          >
            <v-icon icon="mdi-delete-outline" size="24" />
          </v-btn>
        </template>
      </dialog-remove-section>
    </div>
  </div>
</template>
<script>
import DialogRemoveSection from './StoryboardDialogRemoveSection.vue'
import { formatStoryboardTime } from '@/common/helpers/storyboardTime.js'

export default {
  name: 'StoryboardRowDense',
  components: { DialogRemoveSection },
  props: {
    isLastSection: { type: Boolean, required: true },
    itemKey: { type: String, required: true },
    layoutMode: { type: Boolean, required: true },
    disabled: { type: Boolean, default: false },
    showTime: { type: Boolean, default: true },
    showResponsible: { type: Boolean, default: true },
    showMaterials: { type: Boolean, default: false },
    parseTime: { type: Boolean, default: false },
    dimmed: { type: Boolean, default: false },
    hasComment: { type: Boolean, default: false },
  },
  emits: ['moveDown', 'moveUp', 'delete'],
  data() {
    return { commentOpen: false }
  },
  computed: {
    // A non-empty comment is always shown; the toggle is for opening an empty one.
    showComment() {
      return this.commentOpen || this.hasComment
    },
    // Builds the CSS grid template from the set of visible optional columns, so
    // the dense layout adapts to any combination of time/responsible/material
    // and grows an extra row for the comment when present.
    gridStyle() {
      const columns = []
      if (this.showTime) columns.push('time')
      if (this.showResponsible) columns.push('responsible')
      if (this.showMaterials) columns.push('material')

      const middle = columns.length > 0 ? columns : ['text']
      const rows = []
      if (columns.length > 0) {
        rows.push(columns.join(' '))
      }
      rows.push(middle.map(() => 'text').join(' '))
      if (this.showComment) {
        rows.push(middle.map(() => 'comment').join(' '))
      }

      return {
        gridTemplateAreas: rows.map((row) => `"handle ${row} controls"`).join(' '),
        gridTemplateColumns: `min-content ${middle.map(() => '1fr').join(' ')} min-content`,
      }
    },
  },
  methods: {
    formatStoryboardTime,
    toggleComment() {
      this.commentOpen = !this.commentOpen
    },
  },
}
</script>
<style scoped lang="scss">
.e-storyboard-row__delete {
  color: rgba(0, 0, 0, 0.54) !important;

  &:hover {
    color: #d32f2f !important;
  }
}

.e-storyboard-row--dimmed {
  opacity: 0.35;
  transition: opacity 0.2s ease;
}

.e-storyboard-row--dense {
  display: grid;
  gap: 0.5rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  align-items: baseline;

  .e-storyboard-row__time {
    grid-area: time;
  }

  .e-storyboard-row__text {
    grid-area: text;
  }

  .e-storyboard-row__responsible {
    grid-area: responsible;
  }

  .e-storyboard-row__materials {
    grid-area: material;
  }

  .e-storyboard-row__comment {
    grid-area: comment;
  }

  .e-storyboard-row__handle {
    grid-area: handle;
    margin-right: -6px;
    margin-left: 2px;
  }

  .e-storyboard-row__controls {
    grid-area: controls;
    display: grid;
    margin-left: -6px;
    margin-right: 2px;
  }
}

/* eslint-disable-next-line vue-scoped-css/no-unused-selector */
.e-form-container + .e-form-container {
  margin-top: 0;
}
</style>
