<template>
  <tr
    class="e-storyboard-row e-storyboard-row--default"
    :class="{ 'e-storyboard-row--dimmed': dimmed }"
  >
    <td v-if="!layoutMode" class="e-storyboard-row__handle">
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
    </td>
    <td v-if="showTime" class="e-storyboard-row__time">
      <api-text-field
        :label="$t('contentNode.storyboard.entity.section.fields.column1')"
        single-line
        :path="`data.sections[${itemKey}].column1`"
        :parse="parseTime ? formatStoryboardTime : null"
        :disabled="layoutMode || disabled"
      />
    </td>
    <td class="e-storyboard-row__text">
      <api-richtext
        :label="$t('contentNode.storyboard.entity.section.fields.column2Html')"
        :path="`data.sections[${itemKey}].column2Html`"
        rows="4"
        :disabled="layoutMode || disabled"
      />
      <api-textarea
        v-if="showComment"
        class="e-storyboard-row__comment mt-1"
        :label="$t('contentNode.storyboard.entity.section.fields.comment')"
        :path="`data.sections[${itemKey}].comment`"
        rows="2"
        auto-grow
        :disabled="layoutMode || disabled"
      />
    </td>
    <td v-if="showResponsible" class="e-storyboard-row__responsible">
      <api-text-field
        :label="$t('contentNode.storyboard.entity.section.fields.column3')"
        single-line
        :path="`data.sections[${itemKey}].column3`"
        :disabled="layoutMode || disabled"
      />
    </td>
    <td v-if="showMaterials" class="e-storyboard-row__materials">
      <api-text-field
        :label="$t('contentNode.storyboard.entity.section.fields.column4')"
        single-line
        :path="`data.sections[${itemKey}].column4`"
        :disabled="layoutMode || disabled"
      />
    </td>
    <td v-if="!layoutMode && !disabled" class="e-storyboard-row__controls">
      <div class="d-flex flex-column align-center">
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
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              density="comfortable"
              class="e-storyboard-row__delete"
              color="error"
              :disabled="isLastSection"
              v-bind="props"
            >
              <v-icon icon="mdi-delete-outline" size="24" />
            </v-btn>
          </template>
        </dialog-remove-section>
      </div>
    </td>
  </tr>
</template>
<script>
import DialogRemoveSection from './StoryboardDialogRemoveSection.vue'
import { formatStoryboardTime } from '@/common/helpers/storyboardTime.js'

export default {
  name: 'StoryboardRowDefault',
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

.e-storyboard-row--default {
  vertical-align: baseline;

  .e-storyboard-row__time {
    width: 15%;
    padding-right: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .e-storyboard-row__text {
    width: 70%;
    padding-right: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .e-storyboard-row__responsible {
    width: 15%;
    padding-right: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .e-storyboard-row__materials {
    width: 15%;
    padding-bottom: 0.5rem;
  }

  .e-storyboard-row__controls {
    align-content: space-between;
  }
}
</style>
