<template>
  <v-sheet
    border
    class="ec-comment-thread"
    :class="{ 'ec-comment-thread--active': isActive }"
    elevation="2"
    rounded="lg"
    @click="onThreadClick"
  >
    <!-- Anchored-in-text indicator. Clickable while the anchor still exists in the
         text; once the commented text has been deleted the thread is "orphaned" and
         we show a muted, non-clickable hint instead of a dead jump link. -->
    <button
      v-if="anchorId && !draft && !orphaned"
      type="button"
      class="ec-comment-thread__anchor d-flex align-center gap-1 px-3 pt-2"
      @click.stop="jumpToAnchor"
    >
      <v-icon size="14">mdi-format-quote-close</v-icon>
      <span class="text-caption">{{ $t('components.comments.inText') }}</span>
    </button>
    <div
      v-else-if="anchorId && !draft && orphaned"
      class="ec-comment-thread__anchor ec-comment-thread__anchor--orphaned d-flex align-center gap-1 px-3 pt-2"
      :title="$t('components.comments.anchorRemoved')"
    >
      <v-icon size="14">mdi-comment-remove-outline</v-icon>
      <span class="text-caption">{{ $t('components.comments.anchorRemoved') }}</span>
      <!-- Manual re-anchoring: select text in the activity, then click here. -->
      <v-btn
        class="ml-auto"
        variant="text"
        size="x-small"
        prepend-icon="mdi-anchor"
        :disabled="!commentsController.hasSelection"
        :title="$t('components.comments.reanchorHint')"
        @click.stop="reanchorToSelection"
      >
        {{ $t('components.comments.reanchor') }}
      </v-btn>
    </div>

    <!-- The text the thread refers to, where the highlight isn't right next to
         the card (drawer, orphaned and resolved threads). -->
    <blockquote v-if="quoteText" class="ec-comment-thread__quote text-caption">
      {{ quoteText }}
    </blockquote>

    <!-- Draft: composing a brand-new anchored thread -->
    <div v-if="draft" class="px-3 py-2">
      <div class="ec-comment-thread__anchor d-flex align-center gap-1 mb-1">
        <v-icon size="14">mdi-format-quote-close</v-icon>
        <span class="text-caption">{{ $t('components.comments.inText') }}</span>
      </div>
      <e-richtext
        :vee-id="`comment-draft-${anchorId}`"
        autofocus
        class="e-story-day e-story-day--textmode"
        :placeholder="$t('components.comments.placeholder')"
        @update:model-value="draftText = $event"
      />
      <div class="d-flex align-center justify-end mt-2 gap-1">
        <v-btn variant="text" size="small" :disabled="saving" @click="cancelDraft">
          {{ $t('global.button.cancel') }}
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          color="primary"
          :loading="saving"
          :disabled="draftText.length === 0"
          @click="saveDraft"
        >
          {{ $t('components.comments.send') }}
        </v-btn>
      </div>
    </div>

    <!-- Existing thread. Guard on `thread` (not a plain v-else): when a draft is
         confirmed, controller.draft becomes null a frame before the layout drops
         the draft card, so this can briefly render with neither draft nor thread. -->
    <template v-else-if="thread">
      <div class="d-flex align-center justify-end px-2 pt-1 gap-1">
        <v-btn
          variant="text"
          size="x-small"
          :prepend-icon="resolved ? 'mdi-restore' : 'mdi-check-circle-outline'"
          :loading="resolving"
          @click.stop="toggleResolved"
        >
          {{
            resolved
              ? $t('components.comments.reopen')
              : $t('components.comments.resolve')
          }}
        </v-btn>
        <PopoverPrompt
          v-if="rootDeletable"
          type="error"
          :submit-action="deleteThread"
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
          <p class="mb-0">{{ $t('components.comments.deleteThreadWarning') }}</p>
        </PopoverPrompt>
      </div>

      <div
        v-if="resolved"
        class="ec-comment-thread__resolved-info d-flex align-center gap-1 px-3 text-caption text-medium-emphasis"
      >
        <v-icon size="14">mdi-check-circle-outline</v-icon>
        <span>{{ resolvedInfo }}</span>
      </div>

      <CommentMessage
        :comment="thread.root"
        :deletable="false"
        @updated="commentsController.reload()"
      />
      <CommentMessage
        v-for="reply in thread.replies"
        :key="reply._meta.self"
        :comment="reply"
        :can-moderate="isManager"
        class="ec-comment-message--reply"
        @delete="deleteComment(reply)"
        @updated="commentsController.reload()"
      />

      <div v-if="!resolved" class="px-3 pb-2 pt-1">
        <e-richtext
          :key="replyKey"
          :vee-id="`comment-reply-${thread.root._meta.self}`"
          class="e-story-day e-story-day--textmode"
          :placeholder="$t('components.comments.reply')"
          @update:model-value="replyText = $event"
        />
        <div class="d-flex justify-end mt-1">
          <v-btn
            variant="text"
            size="small"
            color="primary"
            :loading="saving"
            :disabled="replyText.length === 0"
            @click.stop="sendReply"
          >
            {{ $t('components.comments.send') }}
          </v-btn>
        </div>
      </div>
    </template>
  </v-sheet>
</template>

<script>
import CommentMessage from '@/components/comments/CommentMessage.vue'
import PopoverPrompt from '@/components/prompt/PopoverPrompt.vue'
import { campRoleMixin } from '@/mixins/campRoleMixin.js'

export default {
  name: 'CommentThread',
  components: { CommentMessage, PopoverPrompt },
  mixins: [campRoleMixin],
  inject: ['commentsController'],
  props: {
    // An existing thread: { root, replies, anchorId, anchorText, contentNode, resolved }.
    thread: {
      type: Object,
      default: null,
    },
    // A pending draft: { contentNodeUri, anchorId, anchorText }.
    draft: {
      type: Object,
      default: null,
    },
    activity: {
      type: Object,
      required: true,
    },
    // True when this thread is anchored but its commented text has been deleted,
    // so the highlight can no longer be found. Set by Comments.vue for threads it
    // places in the general (unanchored) section.
    orphaned: {
      type: Boolean,
      default: false,
    },
    // Show the anchorText snapshot as a quote on the card. On in the drawer and
    // for orphaned/resolved threads; off for margin cards that float right next
    // to their (highlighted) text.
    showQuote: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      draftText: '',
      replyText: '',
      saving: false,
      resolving: false,
      // Bumped after sending to remount (and thus clear) the reply editor.
      replyKey: 0,
    }
  },
  computed: {
    // For campRoleMixin (isManager etc.).
    camp() {
      return this.activity.camp()
    },
    anchorId() {
      return this.draft ? this.draft.anchorId : this.thread?.anchorId
    },
    quoteText() {
      if (!this.showQuote) {
        return null
      }
      return this.draft ? this.draft.anchorText : this.thread?.anchorText
    },
    resolved() {
      return !!this.thread?.resolved
    },
    resolvedInfo() {
      const root = this.thread?.root
      if (!root?.resolvedAt) {
        return ''
      }
      const date = this.$date(root.resolvedAt).format(
        this.$t('global.datetime.dateTimeLong')
      )
      const name =
        typeof root.resolvedBy === 'function' ? root.resolvedBy()?.displayName : null
      if (!name) {
        return date
      }
      return this.$t('components.comments.resolvedBy', { name, date })
    },
    isActive() {
      return (
        this.commentsController.activeCommentId === this.anchorId ||
        this.commentsController.activeCommentId === this.thread?.root?._meta?.self
      )
    },
    // The author may delete their own thread; camp managers may moderate.
    rootDeletable() {
      if (!this.thread) {
        return false
      }
      return (
        this.thread.root.author()._meta.self ===
          this.$store.getters.getLoggedInUser?._meta.self || this.isManager
      )
    },
    contentNodeUri() {
      if (this.draft) {
        return this.draft.contentNodeUri
      }
      return this.thread?.contentNode?.()?._meta?.self ?? null
    },
  },
  watch: {
    // Mirrored onto the controller so beginThread can avoid silently discarding
    // a draft the user already typed into.
    draftText(value) {
      if (this.draft) {
        this.commentsController.draftHasText = value.length > 0
      }
    },
  },
  methods: {
    onThreadClick() {
      if (this.thread) {
        this.commentsController.setActive(this.thread.root._meta.self)
      }
    },
    jumpToAnchor() {
      if (this.contentNodeUri && this.anchorId) {
        this.commentsController.setActive(this.thread?.root?._meta?.self ?? this.anchorId)
        this.commentsController.scrollToAnchor(this.contentNodeUri, this.anchorId)
      }
    },
    // Re-attach this orphaned thread to the text currently selected in one of
    // the activity's editors, and persist the new anchor on the comment.
    async reanchorToSelection() {
      const result = this.commentsController.reanchorToSelection({
        anchorId: this.anchorId,
        contentNodeUri: this.contentNodeUri,
      })
      if (!result) {
        return
      }
      await this.thread.root.$patch({
        contentNode: result.contentNodeUri,
        anchorText: result.anchorText,
      })
      await this.commentsController.reload()
    },
    async saveDraft() {
      this.saving = true
      try {
        await this.api.post(await this.api.href(this.api.get(), 'comments'), {
          textHtml: this.draftText,
          activity: this.activity._meta.self,
          camp: this.activity.camp()._meta.self,
          contentNode: this.draft.contentNodeUri,
          anchorId: this.draft.anchorId,
          anchorText: this.draft.anchorText || null,
        })
        // Only now — when the comment actually exists — does the draft decoration
        // become a real mark in the content (persisted via the editor save flow).
        // If the drafted text was deleted while composing, the thread simply
        // starts out orphaned.
        this.commentsController.commitDraft()
        this.draftText = ''
        await this.commentsController.reload()
      } finally {
        this.saving = false
      }
    },
    cancelDraft() {
      this.commentsController.cancelDraft()
      this.draftText = ''
    },
    async sendReply() {
      this.saving = true
      try {
        await this.api.post(await this.api.href(this.api.get(), 'comments'), {
          textHtml: this.replyText,
          activity: this.activity._meta.self,
          camp: this.activity.camp()._meta.self,
          parent: this.thread.root._meta.self,
        })
        this.replyText = ''
        this.replyKey++
        await this.commentsController.reload()
      } finally {
        this.saving = false
      }
    },
    async toggleResolved() {
      this.resolving = true
      try {
        const resolving = !this.resolved
        await this.thread.root.$patch({ resolved: resolving })
        // Resolving dismisses the thread (Google-Docs behaviour): drop the focus,
        // otherwise its highlight would linger as "active" in the text even
        // though the card just left the margin.
        if (resolving && this.isActive) {
          this.commentsController.setActive(null)
        }
        await this.commentsController.reload()
      } finally {
        this.resolving = false
      }
    },
    async deleteThread() {
      // Clear the highlight first, then delete the root (replies cascade in the DB).
      if (this.anchorId && this.contentNodeUri) {
        this.commentsController.removeAnchor(this.contentNodeUri, this.anchorId)
      }
      await this.thread.root.$del()
      await this.commentsController.reload()
    },
    async deleteComment(comment) {
      await comment.$del()
      await this.commentsController.reload()
    },
  },
}
</script>

<style scoped>
.ec-comment-thread {
  background-color: #fffdf5;
  border-color: #f0c000;
  width: 100%;
  cursor: default;
}
.ec-comment-thread--active {
  box-shadow: 0 0 0 2px #f0c000 !important;
}
.ec-comment-thread__anchor {
  background: none;
  border: none;
  color: #8a6d00;
  cursor: pointer;
}
.ec-comment-thread__anchor--orphaned {
  color: rgba(0, 0, 0, 0.5);
  cursor: default;
}
.ec-comment-thread__quote {
  border-left: 3px solid #f0c000;
  margin: 6px 12px 0;
  padding: 1px 8px;
  color: rgba(0, 0, 0, 0.6);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ec-comment-thread__resolved-info {
  color: rgba(0, 0, 0, 0.5);
}
.e-story-day :deep(.v-text-field) {
  margin-top: 0;
  padding-top: 0;
}
/* disable the bottom border shown for VTextField in regular style */
.e-story-day--textmode :deep(.v-input__slot)::before {
  display: none;
}
</style>
