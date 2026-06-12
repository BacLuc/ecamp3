<template>
  <div
    class="editor"
    :class="{
      'editor--editable': editable,
      'editor--link-cursor': hoverCursor,
      'editor--comments': commentsActive,
    }"
  >
    <bubble-menu
      v-if="withExtensions"
      ref="bubbleMenu"
      :editor="editor"
      :should-show="shouldShow"
      class="z-10"
    >
      <div class="elevation-4 ec-tiptap-toolbar bg-white">
        <v-toolbar
          class="elevation-0 ec-tiptap-toolbar--first"
          density="compact"
          color="transparent"
        >
          <template v-if="commentsActive">
            <TiptapToolbarButton
              icon="mdi-comment-plus-outline"
              :title="$t('components.comments.addComment')"
              @click="addCommentOnSelection"
            />
            <v-divider vertical class="mx-1" />
          </template>
          <TiptapToolbarButton
            icon="mdi-format-bold"
            :class="editor.isActive('bold') ? 'v-item--active v-btn--active' : ''"
            @click="editor.chain().focus().toggleBold().run()"
          />
          <TiptapToolbarButton
            icon="mdi-format-italic"
            :class="editor.isActive('italic') ? 'v-item--active v-btn--active' : ''"
            @click="editor.chain().focus().toggleItalic().run()"
          />
          <TiptapToolbarButton
            icon="mdi-format-underline"
            :class="editor.isActive('underline') ? 'v-item--active v-btn--active' : ''"
            @click="editor.chain().focus().toggleUnderline().run()"
          />
          <TiptapToolbarButton
            icon="mdi-format-strikethrough"
            :class="editor.isActive('strike') ? 'v-item--active v-btn--active' : ''"
            @click="editor.chain().focus().toggleStrike().run()"
          />

          <div class="d-none d-sm-contents">
            <v-divider vertical class="mx-1" />

            <TiptapToolbarButton
              icon="mdi-format-list-bulleted"
              :class="editor.isActive('bulletList') ? 'v-item--active v-btn--active' : ''"
              @click="editor.chain().focus().toggleBulletList().run()"
            />
            <TiptapToolbarButton
              icon="mdi-format-list-numbered"
              :class="
                editor.isActive('orderedList') ? 'v-item--active v-btn--active' : ''
              "
              @click="editor.chain().focus().toggleOrderedList().run()"
            />

            <template
              v-if="
                editor.can().sinkListItem('listItem') ||
                editor.can().liftListItem('listItem')
              "
            >
              <v-divider vertical class="mx-1" />
              <TiptapToolbarButton
                icon="mdi-format-indent-decrease"
                :disabled="!editor.can().liftListItem('listItem')"
                @click="editor.chain().focus().liftListItem('listItem').run()"
              />
              <TiptapToolbarButton
                icon="mdi-format-indent-increase"
                :disabled="!editor.can().sinkListItem('listItem')"
                @click="editor.chain().focus().sinkListItem('listItem').run()"
              />
            </template>
          </div>
        </v-toolbar>
        <v-divider class="ec-tiptap-toolbar__mobile-divider" />
        <v-toolbar
          class="elevation-0 ec-tiptap-toolbar--second"
          density="compact"
          color="transparent"
        >
          <TiptapToolbarButton
            icon="mdi-format-list-bulleted"
            :class="editor.isActive('bulletList') ? 'v-item--active v-btn--active' : ''"
            @click="editor.chain().focus().toggleBulletList().run()"
          />
          <TiptapToolbarButton
            icon="mdi-format-list-numbered"
            :class="editor.isActive('orderedList') ? 'v-item--active v-btn--active' : ''"
            @click="editor.chain().focus().toggleOrderedList().run()"
          />

          <template
            v-if="
              editor.can().sinkListItem('listItem') ||
              editor.can().liftListItem('listItem')
            "
          >
            <v-divider vertical class="mx-1" />
            <TiptapToolbarButton
              icon="mdi-format-indent-decrease"
              :disabled="!editor.can().liftListItem('listItem')"
              @click="editor.chain().focus().liftListItem('listItem').run()"
            />
            <TiptapToolbarButton
              icon="mdi-format-indent-increase"
              :disabled="!editor.can().sinkListItem('listItem')"
              @click="editor.chain().focus().sinkListItem('listItem').run()"
            />
          </template>
        </v-toolbar>
      </div>
    </bubble-menu>
    <editor-content class="editor__content" :editor="editor" />
  </div>
</template>
<script>
import { Editor, EditorContent } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import BulletList from '@tiptap/extension-bullet-list'
import HardBreak from '@tiptap/extension-hard-break'
import ListItem from '@tiptap/extension-list-item'
import OrderedList from '@tiptap/extension-ordered-list'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Strike from '@tiptap/extension-strike'
import Underline from '@tiptap/extension-underline'
import History from '@tiptap/extension-history'
import Placeholder from '@tiptap/extension-placeholder'
import TiptapToolbarButton from '@/components/form/tiptap/TiptapToolbarButton.vue'
import {
  AutoLinkDecoration,
  AutoLinkKey,
} from '@/components/form/tiptap/AutoLinkDecoration.js'
import { CommentMark, findSnippetRanges } from '@/components/form/tiptap/CommentMark.js'
import { randomUuid } from '@/helpers/randomUuid.js'
import { isTextSelection } from '@tiptap/core'

function isSillyThingThatHappensWithTipTap(val) {
  return val && Object.prototype.hasOwnProperty.call(val, 'isTrusted')
}

export default {
  name: 'TiptapEditor',
  components: {
    TiptapToolbarButton,
    EditorContent,
    BubbleMenu,
  },
  inject: {
    // Provided by the Comments panel (Comments.vue) when the comments feature is
    // active. Absent (null) for editors outside an activity's comment context,
    // e.g. the comment composer itself or plain richtext fields.
    commentsController: { default: null },
  },
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
    withExtensions: {
      type: Boolean,
      default: false,
    },
    editable: {
      type: Boolean,
      default: true,
    },
    // Self IRI of the content node this editor edits. When set together with an
    // injected commentsController, inline (anchored) commenting is enabled here.
    commentContentNodeUri: {
      type: String,
      default: '',
    },
    // Move the cursor into this editor once it is mounted. Used by the comment
    // composers so the user can start typing immediately (Google-Docs style).
    autofocus: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['tiptapUpdate', 'focus', 'blur'],
  data() {
    const placeholder = Placeholder.configure({
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-empty',
      emptyNodeText: '',
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
      placeholder: () => {
        return this.placeholder
      },
    })
    const extensions = [Document, Paragraph, Text, placeholder]
    if (this.withExtensions) {
      extensions.push(
        ...[
          History,
          Bold,
          Italic,
          Underline,
          Strike,
          ListItem,
          BulletList,
          OrderedList,
          AutoLinkDecoration,
          // headings currently disabled (see issue #2657)
          HardBreak,
        ]
      )
    }
    // The comment mark is registered unconditionally — also in editors outside a
    // comments context, and in the comment composers themselves. An editor whose
    // schema doesn't know the mark would silently drop every
    // <span data-comment-id> from the content on its next save, destroying the
    // anchors. The comment UI (bubble-menu button, click-to-focus, highlight
    // styling) stays gated on commentsActive.
    extensions.push(
      CommentMark.configure({
        onCommentClick: (commentId) => this.commentsController?.focusComment(commentId),
      })
    )

    return {
      hoverCursor: false,
      editor: new Editor({
        extensions: extensions,
        content: this.modelValue,
        onUpdate: this.onUpdate,
        onSelectionUpdate: this.onSelectionUpdate,
        onFocus: (e) => this.$emit('focus', e),
        onBlur: (e) => this.$emit('blur', e),
        editable: this.editable,
      }),
      placeholderExtension: placeholder,
      regex: {
        emptyParagraph: /<p><\/p>/,
        lineBreak1: /<br>/g,
        lineBreak2: /<br\/>/g,
      },
      // copied from @tiptap/extension-bubble-menu
      // https://github.com/ueberdosis/tiptap/blob/64f36b8d93b437f2230d8538a8ecdb504842d5f8/packages/extension-bubble-menu/src/bubble-menu-plugin.ts#L195-L216
      // modifications:
      // - autolink adaption
      // - this.$refs.bubbleMenu instead of this.element
      shouldShow: ({ view, state, from, to }) => {
        const { doc, selection } = state
        const { empty } = selection

        // Sometime check for `empty` is not enough.
        // Doubleclick an empty paragraph returns a node size of 2.
        // So we check also for an empty text size.
        const isEmptyTextBlock =
          !doc.textBetween(from, to).length && isTextSelection(state.selection)

        // ===== START EDIT eCamp ======
        // Don't show if selection is within of an autolink
        if (this.withExtensions) {
          const links = AutoLinkKey.getState(state).find(
            from,
            to,
            (decoration) => decoration.start <= from && to <= decoration.end
          )
          if (links.length) {
            return false
          }
        }
        // ===== END   EDIT eCamp ======

        // When clicking on a element inside the bubble menu the editor "blur" event
        // is called and the bubble menu item is focussed. In this case we should
        // consider the menu as part of the editor and keep showing the menu
        // ===== START EDIT eCamp ======
        const isChildOfMenu = this.$refs.bubbleMenu?.$el.contains(document.activeElement)
        // ===== END   EDIT eCamp ======

        const hasEditorFocus = view.hasFocus() || isChildOfMenu

        if (!hasEditorFocus || empty || isEmptyTextBlock || !this.editor.isEditable) {
          return false
        }

        return true
      },
    }
  },
  computed: {
    commentsActive() {
      return !!this.commentContentNodeUri && !!this.commentsController
    },
    activeAnchorId() {
      return this.commentsController?.activeAnchorId ?? null
    },
    highlightAnchorIds() {
      return this.commentsController?.highlightAnchorIds ?? []
    },
    // Every anchorId that still has a comment (open or resolved) plus the pending
    // draft. Comment marks whose id is not in this set are orphans (the comment
    // was deleted, or a draft was abandoned) and get stripped from the text.
    knownAnchorIds() {
      return this.commentsController?.allAnchorIds ?? []
    },
    commentsLoaded() {
      return this.commentsController?.commentsLoaded ?? false
    },
  },
  watch: {
    modelValue(val) {
      // Be careful to only use setContent when absolutely necessary, because it resets the user's cursor to the end
      // of the input field
      if (val !== this.html() && !isSillyThingThatHappensWithTipTap(val)) {
        // we do not want to trigger onUpdate when modelValue is updated from outside
        this.editor.commands.setContent(val, { emitUpdate: false })
        this.$nextTick(() => {
          this.applyActiveCommentStyling()
          // Content replaced from outside (e.g. another user's save arriving) may
          // have lost anchors — let re-anchoring repair what it can.
          this.reconcileCommentMarks()
        })
      }
    },
    editable() {
      this.editor.setOptions({
        editable: this.editable,
      })
    },
    activeAnchorId() {
      this.applyActiveCommentStyling()
    },
    highlightAnchorIds() {
      this.applyActiveCommentStyling()
    },
    knownAnchorIds() {
      this.reconcileCommentMarks()
    },
    commentsLoaded() {
      this.reconcileCommentMarks()
    },
  },
  mounted() {
    document.addEventListener('keydown', this.specialKeyListeners, { passive: true })
    document.addEventListener('keyup', this.specialKeyListeners, { passive: true })
    document.addEventListener('contextmenu', this.specialMenuListeners, { passive: true })
    if (this.commentsActive) {
      this.commentEditorApi = {
        scrollToComment: this.scrollToComment,
        removeCommentMark: this.removeCommentMark,
        hasAnchor: this.hasAnchor,
        findSnippetRanges: this.findSnippetRanges,
        applyAnchor: this.applyAnchor,
        applyAnchorToSelection: this.applyAnchorToSelection,
        commitDraft: this.commitDraft,
        cancelDraft: this.cancelDraft,
      }
      this.commentsController.registerEditor(
        this.commentContentNodeUri,
        this.commentEditorApi
      )
      this.applyActiveCommentStyling()
      this.reconcileCommentMarks()
    }
    if (this.autofocus) {
      // Wait a tick so the editor element is in the DOM (e.g. a freshly opened
      // draft card) before placing the cursor at the end of any existing text.
      this.$nextTick(() => this.editor.commands.focus('end'))
    }
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.specialKeyListeners)
    document.removeEventListener('keyup', this.specialKeyListeners)
    document.removeEventListener('contextmenu', this.specialMenuListeners)
    if (this.commentsActive && this.commentEditorApi) {
      this.commentsController.unregisterEditor(
        this.commentContentNodeUri,
        this.commentEditorApi
      )
    }
  },
  methods: {
    focus() {
      this.editor.commands.focus()
    },
    // The current editor HTML, cleaned up to match what the backend HTMLPurifier
    // expects. This is intentionally a method, not a computed: TipTap mutates the
    // editor outside Vue's reactivity, so a computed has no dependency that would
    // invalidate it and ends up frozen at its first value — which silently
    // truncated comment text to whatever it was on the first keystroke.
    html() {
      return this.editor
        .getHTML()
        .replace(this.regex.emptyParagraph, '')
        .replace(this.regex.lineBreak1, '<br />')
        .replace(this.regex.lineBreak2, '<br />')
    },
    // Lets the controller track which editor holds a text selection, so an
    // orphaned thread can be manually re-anchored to it from the panel. The
    // ProseMirror selection survives blur, so it is still valid when the user
    // then clicks the re-anchor button on the card.
    onSelectionUpdate() {
      if (!this.commentsActive) {
        return
      }
      const { from, to } = this.editor.state.selection
      this.commentsController.reportSelection(
        this.commentContentNodeUri,
        this.commentEditorApi,
        from !== to
      )
    },
    onUpdate() {
      this.$emit('tiptapUpdate', this.html())
      if (this.commentsActive) {
        this.$nextTick(() => {
          this.applyActiveCommentStyling()
          // Heals delete-then-retype: once the snippet of an orphaned open thread
          // reappears (uniquely), its mark is re-applied. Cheap when nothing is
          // orphaned, thanks to the hasAnchor short-circuit.
          this.reconcileCommentMarks()
        })
      }
    },
    addCommentOnSelection() {
      const { state } = this.editor
      const { from, to } = state.selection
      if (from === to) {
        return
      }
      const anchorId = randomUuid()
      // Snapshot of the selected text: shown as a quote on the thread card and
      // used to re-anchor the thread if its mark ever gets lost. Capped well
      // below the backend's 255-char limit.
      const anchorText = state.doc.textBetween(from, to, '\n').trim().substring(0, 250)
      const started = this.commentsController.beginThread({
        contentNodeUri: this.commentContentNodeUri,
        anchorId,
        anchorText,
      })
      // The highlight stays a local-only decoration until the comment is sent;
      // nothing is persisted for a draft (beginThread can also refuse, when
      // another draft with typed text is already open — then it gets focused).
      if (started) {
        this.editor.chain().startCommentDraft(anchorId).run()
      }
    },
    scrollToComment(commentId) {
      const el = this.$el.querySelector(`span[data-comment-id="${commentId}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    removeCommentMark(commentId) {
      this.editor.commands.unsetCommentMarkById(commentId)
    },
    // Whether this editor's document currently contains a mark for the thread.
    hasAnchor(commentId) {
      let found = false
      this.editor.state.doc.descendants((node) => {
        if (found) {
          return false
        }
        found = node.marks.some(
          (mark) => mark.type.name === 'comment' && mark.attrs.commentId === commentId
        )
      })
      return found
    },
    // {from, to} ranges where the snippet occurs in this editor (for re-anchoring).
    findSnippetRanges(snippet) {
      return findSnippetRanges(this.editor.state.doc, snippet)
    },
    // Re-apply a lost mark over the given range. Dispatches a transaction, so the
    // healed anchor is persisted through the normal save flow.
    applyAnchor(commentId, range) {
      this.editor.commands.applyCommentMark(commentId, range.from, range.to)
    },
    // Manual re-anchoring: mark the current selection as the thread's new anchor.
    // Returns the new anchorText snapshot, or null without a selection.
    applyAnchorToSelection(commentId) {
      const { state } = this.editor
      const { from, to } = state.selection
      if (from === to) {
        return null
      }
      const anchorText = state.doc.textBetween(from, to, '\n').trim().substring(0, 250)
      this.editor.commands.applyCommentMark(commentId, from, to)
      return anchorText
    },
    commitDraft() {
      return this.editor.commands.commitCommentDraft()
    },
    cancelDraft() {
      return this.editor.commands.cancelCommentDraft()
    },
    // Strip comment-mark highlights that no longer correspond to a comment (a
    // thread that was deleted while this editor was unmounted, or a mark restored
    // by undo after its thread was gone), then give threads whose mark is missing
    // a chance to re-anchor via their text snippet. We only do this once the
    // comments have actually loaded, otherwise we'd wipe every (still-valid)
    // highlight while the collection is empty.
    reconcileCommentMarks() {
      if (!this.commentsActive || !this.commentsLoaded) {
        return
      }
      const known = new Set(this.knownAnchorIds)
      const orphans = new Set()
      this.editor.state.doc.descendants((node) => {
        node.marks.forEach((mark) => {
          const id = mark.attrs?.commentId
          if (id && !known.has(id)) {
            orphans.add(id)
          }
        })
      })
      orphans.forEach((id) => this.editor.commands.unsetCommentMarkById(id))
      this.commentsController.reanchorContentNode(this.commentContentNodeUri)
    },
    applyActiveCommentStyling() {
      if (!this.commentsActive) {
        return
      }
      const activeId = this.activeAnchorId
      const highlighted = this.highlightAnchorIds
      // The highlight colour is set inline (rather than via CSS classes) because
      // these spans live inside the scoped editor where :deep() state selectors
      // don't reliably out-specify the base .comment-mark rule. Inline styles win
      // unconditionally. The base .comment-mark CSS still provides the default
      // (open) highlight when we clear the inline override.
      this.$el.querySelectorAll('span[data-comment-id]').forEach((el) => {
        const id = el.getAttribute('data-comment-id')
        const isActive = id === activeId
        const shouldHighlight = highlighted.includes(id)
        if (isActive) {
          el.style.backgroundColor = '#ffe066'
          el.style.borderBottomColor = ''
          el.style.cursor = ''
        } else if (shouldHighlight) {
          // Open thread: default highlight (clear inline overrides, base CSS wins).
          el.style.backgroundColor = ''
          el.style.borderBottomColor = ''
          el.style.cursor = ''
        } else {
          // Resolved thread or orphaned mark: no permanent highlight. It only
          // reappears while active (i.e. the user clicked the thread open).
          el.style.backgroundColor = 'transparent'
          el.style.borderBottomColor = 'transparent'
          el.style.cursor = 'text'
        }
      })
    },
    specialKeyListeners(event) {
      this.hoverCursor = event.metaKey || event.ctrlKey
    },
    specialMenuListeners() {
      this.hoverCursor = false
    },
  },
}
</script>

<style scoped lang="scss">
@use 'vuetify/settings';
@use 'sass:map';

div.editor:deep(p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #8b8b8b;
  pointer-events: none;
  height: 0;
}

div.editor {
  -webkit-box-flex: 1;
  -ms-flex: 1 1 auto;
  flex: 1 1 auto;
  padding-top: 6px;
  max-width: 100%;
  min-width: 0;
  width: 100%;
}

div.editor:deep(.ec-tiptap-toolbar) {
  border-radius: 6px;
}

.ec-tiptap-toolbar--second,
.ec-tiptap-toolbar__mobile-divider {
  display: block;
  @media #{map.get(settings.$display-breakpoints, 'sm-and-up')} {
    display: none;
  }
}

div.editor:deep(.ec-tiptap-toolbar--first .v-toolbar__content) {
  justify-content: space-between;
}

div.editor:deep(.ec-tiptap-toolbar .v-toolbar__content) {
  gap: 2px;
  padding: 0 4px;
  .v-btn {
    margin: 0;
  }
}

div.editor:deep(.editor__content) {
  -webkit-box-flex: 1;
  -ms-flex: 1 1 auto;
  flex: 1 1 auto;
  max-width: 100%;
}

div.editor:deep(.editor__content .ProseMirror) {
  border: 0 !important;
  box-shadow: none !important;
  outline: none;
  color: rgba(0, 0, 0, 0.87);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.v-theme--light.v-input--is-disabled div.editor:deep(.editor__content .ProseMirror) {
  color: rgba(0, 0, 0, 0.38);
}

div.editor:deep(.editor__content .ProseMirror p) {
  letter-spacing: -0.011em;
}
div.editor:deep(.editor__content .ProseMirror p),
div.editor:deep(.editor__content .ProseMirror ol),
div.editor:deep(.editor__content .ProseMirror ul) {
  margin-bottom: 6px;
}
div.editor:deep(.editor__content .ProseMirror ol),
div.editor:deep(.editor__content .ProseMirror ul) {
  padding-left: 24px;
}
div.editor:deep(.editor__content .ProseMirror h1) {
  margin-top: 18px;
  margin-bottom: 6px;
}
div.editor:deep(.editor__content .ProseMirror h2) {
  margin-top: 15px;
  margin-bottom: 6px;
}
div.editor:deep(.editor__content .ProseMirror h3) {
  margin-top: 12px;
  margin-bottom: 6px;
}
div.editor:deep(.editor__content .ProseMirror :first-child) {
  margin-top: 0;
}
div.editor:deep(.editor__content .ProseMirror li p) {
  margin-bottom: 3px;
}
div.editor:deep(.editor__content .ProseMirror li p:not(:last-child)) {
  margin-bottom: 0;
}
/* Default (open) highlight, only in editors that are part of a comments context
   (elsewhere anchors stay invisible). The translucent background makes
   overlapping threads stack into a darker highlight, Google-Docs style. Active
   and resolved states are applied as inline styles in
   applyActiveCommentStyling(); see the comment there for why. */
.editor--comments:deep(.editor__content .ProseMirror .comment-mark) {
  background-color: rgba(240, 192, 0, 0.25);
  border-bottom: 2px solid rgba(240, 192, 0, 0.85);
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}
/* A draft being composed looks like the active thread it is about to become. */
.editor--comments:deep(.editor__content .ProseMirror .comment-mark--draft) {
  background-color: #ffe066;
}
.editor.editor--editable {
  cursor: text;
}
.editor.editor--editable:deep(.autolink) {
  cursor: text;
}
.editor.editor--link-cursor:deep(.autolink) {
  cursor: pointer;
}
</style>
