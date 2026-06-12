<template>
  <div class="ec-comment-message px-3 py-2">
    <!-- Edit-in-place (author only), Google-Docs style. -->
    <div v-if="editing" @click.stop>
      <e-richtext
        :vee-id="`comment-edit-${comment._meta.self}`"
        :model-value="editText"
        autofocus
        class="e-story-day e-story-day--textmode"
        @update:model-value="editText = $event"
      />
      <div class="d-flex align-center justify-end mt-1 gap-1">
        <v-btn variant="text" size="small" :disabled="saving" @click.stop="cancelEdit">
          {{ $t('global.button.cancel') }}
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          color="primary"
          :loading="saving"
          :disabled="editText.length === 0"
          @click.stop="saveEdit"
        >
          {{ $t('global.button.save') }}
        </v-btn>
      </div>
    </div>

    <!-- Comment text is read-only display. We render the stored HTML directly
         rather than instantiating a TipTap editor per comment: it's lighter, and
         a dynamically-mounted read-only editor sometimes failed to attach its
         ProseMirror (empty comment body). The HTML is sanitised server-side by
         InputFilter\CleanHTML, so v-html is safe here. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-else class="ec-comment-text" v-html="comment.textHtml" />

    <div v-if="!editing" class="d-flex align-center justify-space-between mt-1 gap-2">
      <span class="text-caption d-flex align-center">
        <UserAvatar :user="comment.author()" size="20" class="mr-1" />
        {{ comment.author().displayName }}
      </span>
      <span class="d-flex align-center gap-1">
        <span class="text-caption text-medium-emphasis">
          {{ $date(comment.createTime).format($t('global.datetime.dateTimeLong')) }}
          <template v-if="comment.editedAt">
            · {{ $t('components.comments.edited') }}
          </template>
        </span>
        <v-btn
          v-if="isEditable"
          icon="mdi-pencil"
          variant="text"
          size="x-small"
          :title="$t('global.button.edit')"
          @click.stop="startEdit"
        />
        <PopoverPrompt
          v-if="isDeletable"
          type="error"
          :submit-action="confirmDelete"
          :submit-label="$t('global.button.delete')"
          submit-color="error"
          submit-icon="mdi-delete"
        >
          <template #activator="{ props }">
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="x-small"
              :title="$t('global.button.delete')"
              v-bind="props"
              @click.stop
            />
          </template>
          <p class="mb-0">{{ $t('components.comments.deleteCommentWarning') }}</p>
        </PopoverPrompt>
      </span>
    </div>
  </div>
</template>

<script>
import UserAvatar from '@/components/user/UserAvatar.vue'
import PopoverPrompt from '@/components/prompt/PopoverPrompt.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'CommentMessage',
  components: { UserAvatar, PopoverPrompt },
  props: {
    comment: {
      type: Object,
      required: true,
    },
    // The root message is deleted via the thread (to also clear the anchor);
    // replies delete themselves.
    deletable: {
      type: Boolean,
      default: true,
    },
    // Camp managers may delete (but not edit) other people's comments.
    canModerate: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['delete', 'updated'],
  data() {
    return {
      editing: false,
      editText: '',
      saving: false,
    }
  },
  computed: {
    ...mapGetters({
      authUser: 'getLoggedInUser',
    }),
    isAuthor() {
      return this.comment.author()._meta.self === this.authUser?._meta.self
    },
    isEditable() {
      return this.isAuthor
    },
    isDeletable() {
      return this.deletable && (this.isAuthor || this.canModerate)
    },
  },
  methods: {
    startEdit() {
      this.editText = this.comment.textHtml
      this.editing = true
    },
    cancelEdit() {
      this.editing = false
      this.editText = ''
    },
    async saveEdit() {
      this.saving = true
      try {
        await this.comment.$patch({ textHtml: this.editText })
        this.editing = false
        this.editText = ''
        this.$emit('updated')
      } finally {
        this.saving = false
      }
    },
    confirmDelete() {
      this.$emit('delete')
    },
  },
}
</script>

<style scoped>
.ec-comment-message + .ec-comment-message {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}
.ec-comment-message.ec-comment-message--reply {
  margin-left: 12px;
}
.ec-comment-text {
  color: rgba(0, 0, 0, 0.87);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.ec-comment-text :deep(p) {
  margin: 0 0 6px;
}
.ec-comment-text :deep(p:last-child) {
  margin-bottom: 0;
}
.ec-comment-text :deep(ul),
.ec-comment-text :deep(ol) {
  margin: 0 0 6px;
  padding-left: 24px;
}
.ec-comment-text :deep(a) {
  color: #1565c0;
}
.e-story-day :deep(.v-text-field) {
  margin-top: 0;
  padding-top: 0;
}
.e-story-day--textmode :deep(.v-input__slot)::before {
  display: none;
}
</style>
