import { reactive } from 'vue'

/**
 * Coordinates the inline-comment UI between the comments panel (Comments.vue)
 * and the rich-text editors scattered through an activity's content tree.
 *
 * It is provided by Comments.vue and injected by:
 *  - CommentWrapper.vue, for the open/closed state of the panel, and
 *  - TiptapEditor.vue, which registers itself so the panel can highlight /
 *    scroll to an anchored thread, and which calls back when the user creates
 *    or clicks a comment highlight.
 *
 * Editor APIs are kept in a non-reactive closure; only UI state is reactive.
 */
export function createCommentsController() {
  // contentNodeUri -> array of editor APIs. It's an array (not a single entry)
  // because one content node can host several rich-text editors that share the
  // same IRI — e.g. every cell of a Storyboard. The per-editor operations are
  // no-ops on editors that don't contain the given anchor / draft, so calls can
  // safely fan out to all editors registered under the node.
  const editors = {}
  const forEachEditor = (contentNodeUri, fn) => {
    ;(editors[contentNodeUri] ?? []).forEach(fn)
  }
  // The editor currently holding a non-empty text selection: { contentNodeUri, api }.
  // Non-reactive (it holds an editor API); the reactive `hasSelection` flag below
  // mirrors its presence for the UI. Used by manual re-anchoring: select text,
  // then click "re-anchor" on an orphaned thread.
  let selectionHolder = null

  return reactive({
    // Whether the comments panel / drawer is open.
    open: false,
    // The id of the currently focused thread (a comment self-IRI, or an anchorId
    // for a not-yet-saved draft). Used to highlight the matching text.
    activeCommentId: null,
    // The anchorId of the currently focused thread, regardless of whether it was
    // focused via its highlight or its card. Editors highlight the matching span.
    activeAnchorId: null,
    // anchorIds that should carry a visible highlight: the open (unresolved)
    // threads plus the in-progress draft. Anything else (resolved threads, or
    // orphaned marks left behind by a deleted comment) is only highlighted while
    // it is the active thread — so resolved/orphaned text isn't permanently yellow.
    highlightAnchorIds: [],
    // Every anchorId that still maps to a comment (open OR resolved) plus the
    // draft. Editors use this to recognise — and strip — orphaned highlight spans.
    allAnchorIds: [],
    // Per content node IRI: [{ anchorId, anchorText, open }] for every anchored
    // root thread. Editors use this to re-anchor threads whose mark got lost.
    anchorsByNode: {},
    // True once the comments collection has finished loading. Editors must not
    // reconcile (strip) highlights before this, or they'd wipe valid anchors
    // while the collection is momentarily empty.
    commentsLoaded: false,
    // anchorIds whose draft was just committed but whose comment hasn't shown up
    // in the reloaded collection yet. They count as "known" so the reconcile
    // sweep doesn't strip the freshly committed mark during that window;
    // Comments.vue clears them as soon as the matching thread arrives.
    pendingAnchorIds: [],
    // A pending inline thread shown as a local-only editor decoration, with no
    // saved comment yet: { contentNodeUri, anchorId, anchorText }.
    draft: null,
    // Whether the user has typed text into the pending draft. Kept here (not in
    // the card component) so beginThread can avoid discarding typed text.
    draftHasText: false,
    // Whether some editor currently holds a non-empty selection (enables the
    // "re-anchor" button on orphaned threads).
    hasSelection: false,
    // Reloads the comments collection after a mutation. Set by Comments.vue.
    reload: () => {},

    registerEditor(contentNodeUri, api) {
      ;(editors[contentNodeUri] ??= []).push(api)
    },
    unregisterEditor(contentNodeUri, api) {
      const remaining = (editors[contentNodeUri] ?? []).filter((e) => e !== api)
      if (remaining.length) {
        editors[contentNodeUri] = remaining
      } else {
        delete editors[contentNodeUri]
      }
      if (selectionHolder?.api === api) {
        selectionHolder = null
        this.hasSelection = false
      }
    },

    // Called by editors whenever their selection changes. The last editor with a
    // non-empty selection wins; an editor reporting empty only clears the state
    // if it was the holder (other editors keep their selection while blurred).
    reportSelection(contentNodeUri, api, hasSelection) {
      if (hasSelection) {
        selectionHolder = { contentNodeUri, api }
        this.hasSelection = true
      } else if (selectionHolder?.api === api) {
        selectionHolder = null
        this.hasSelection = false
      }
    },

    // Manually re-anchor an orphaned thread to the current text selection
    // (select text, then click "re-anchor" on the card). Applies the thread's
    // mark over the selection and returns { contentNodeUri, anchorText } so the
    // caller can persist the new anchor on the comment, or null when there is no
    // selection to anchor to.
    reanchorToSelection({ anchorId, contentNodeUri }) {
      if (!selectionHolder) {
        return null
      }
      const anchorText = selectionHolder.api.applyAnchorToSelection(anchorId)
      if (!anchorText) {
        return null
      }
      // Safety: clear any leftover marks of this thread elsewhere (there should
      // be none for an orphaned thread, but a concurrent edit could resurrect one).
      if (contentNodeUri && contentNodeUri !== selectionHolder.contentNodeUri) {
        forEachEditor(contentNodeUri, (e) => e.removeCommentMark(anchorId))
      }
      return { contentNodeUri: selectionHolder.contentNodeUri, anchorText }
    },

    // Called by an editor when the user highlights text and hits "add comment".
    // Only one draft can be open at a time (like Google Docs): an empty previous
    // draft is silently replaced, but one with typed text is focused instead of
    // discarded. Returns whether the new draft may start.
    beginThread({ contentNodeUri, anchorId, anchorText }) {
      if (this.draft && this.draftHasText) {
        this.activeCommentId = this.draft.anchorId
        this.open = true
        return false
      }
      if (this.draft) {
        this.cancelDraft()
      }
      this.draft = { contentNodeUri, anchorId, anchorText }
      this.draftHasText = false
      this.activeCommentId = anchorId
      this.open = true
      return true
    },
    // Discard the pending draft. Its highlight is only a decoration, so the
    // document is left untouched.
    cancelDraft() {
      if (this.draft) {
        forEachEditor(this.draft.contentNodeUri, (e) => e.cancelDraft())
      }
      this.draft = null
      this.draftHasText = false
      this.activeCommentId = null
    },
    // The draft was posted as a real comment: turn its decoration into a real,
    // persisted mark (a no-op in editors that don't hold the draft; if the
    // drafted text was deleted meanwhile, the thread lives on as orphaned).
    commitDraft() {
      if (this.draft) {
        this.pendingAnchorIds = [...this.pendingAnchorIds, this.draft.anchorId]
        forEachEditor(this.draft.contentNodeUri, (e) => e.commitDraft())
      }
      this.draft = null
      this.draftHasText = false
    },

    // Called by an editor when the user clicks highlighted text. Ignore clicks on
    // orphaned highlights (no matching comment) so they don't open an empty panel;
    // such spans are stripped on the next reconcile anyway.
    focusComment(commentId) {
      if (this.commentsLoaded && !this.allAnchorIds.includes(commentId)) {
        return
      }
      this.activeCommentId = commentId
      this.open = true
    },
    setActive(commentId) {
      this.activeCommentId = commentId
    },

    // Called by the panel to reveal an anchored thread in its editor.
    scrollToAnchor(contentNodeUri, anchorId) {
      forEachEditor(contentNodeUri, (e) => e.scrollToComment(anchorId))
    },
    // Called by the panel when a thread is deleted, to clear its highlight.
    removeAnchor(contentNodeUri, anchorId) {
      forEachEditor(contentNodeUri, (e) => e.removeCommentMark(anchorId))
    },

    // Re-anchor open threads of this content node whose mark got lost (deleted
    // along with its text and then retyped, or wiped by a concurrent editor's
    // save): when the thread's anchorText snippet occurs exactly once across the
    // node's editors, the mark is re-applied there. Zero or multiple matches
    // leave the thread orphaned — guessing would anchor it to the wrong text.
    // Editors call this after reconciling; the hasAnchor short-circuit keeps the
    // common (nothing orphaned) case cheap.
    reanchorContentNode(contentNodeUri) {
      if (!this.commentsLoaded) {
        return
      }
      const nodeEditors = editors[contentNodeUri] ?? []
      if (!nodeEditors.length) {
        return
      }
      for (const anchor of this.anchorsByNode[contentNodeUri] ?? []) {
        if (!anchor.open || !anchor.anchorText) {
          continue
        }
        if (nodeEditors.some((e) => e.hasAnchor(anchor.anchorId))) {
          continue
        }
        const matches = nodeEditors.map((e) => e.findSnippetRanges(anchor.anchorText))
        const total = matches.reduce((sum, ranges) => sum + ranges.length, 0)
        if (1 !== total) {
          continue
        }
        const editorIndex = matches.findIndex((ranges) => ranges.length)
        nodeEditors[editorIndex].applyAnchor(anchor.anchorId, matches[editorIndex][0])
      }
    },
  })
}
