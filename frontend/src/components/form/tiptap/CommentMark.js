import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Slice, Fragment } from '@tiptap/pm/model'

/**
 * TipTap mark that anchors an inline (Google-Docs-style) comment thread to a
 * range of rich text. It serializes to `<span data-comment-id="...">`, which is
 * explicitly allowlisted in the backend HTMLPurifier config so the anchor
 * survives sanitization on save.
 *
 * The mark carries no behaviour or scripting; it is purely an anchor that the
 * comments panel uses to tie a thread to its text and to highlight / scroll to
 * it. Overlapping threads are supported (`excludes: ''` lets several comment
 * marks coexist on the same characters); they render as nested spans whose
 * translucent backgrounds stack into a darker highlight.
 *
 * The extension also hosts the draft plugin: while the user is composing a new
 * inline comment, the prospective anchor is shown as a local-only decoration
 * that follows text edits. Only when the comment is actually sent does
 * `commitCommentDraft` turn it into a real (persisted) mark — cancelling a
 * draft never dirties the document.
 */

// Plugin key holding the pending draft range: { anchorId, from, to } or null.
export const CommentDraftKey = new PluginKey('commentDraft')

/**
 * Plain text of the document with block boundaries rendered as '\n' — the same
 * shape as `doc.textBetween(from, to, '\n')`, which is used to capture a
 * thread's anchorText snippet. Returns the text plus a map from text offsets
 * back to document positions, so snippet matches can be converted to ranges.
 */
function docTextWithPositions(doc) {
  let text = ''
  const positions = []
  doc.descendants((node, pos) => {
    if (node.isText) {
      for (let i = 0; i < node.text.length; i++) {
        positions.push(pos + i)
      }
      text += node.text
    } else if (node.isBlock && text && !text.endsWith('\n')) {
      positions.push(pos)
      text += '\n'
    }
    return true
  })
  return { text, positions }
}

/**
 * All occurrences (including overlapping ones, so callers can detect ambiguity)
 * of a plain-text snippet in the document, as {from, to} ranges. Used to
 * re-anchor a thread whose mark got lost: a thread is only re-anchored when its
 * snippet matches exactly once.
 */
export function findSnippetRanges(doc, snippet) {
  if (!snippet) {
    return []
  }
  const { text, positions } = docTextWithPositions(doc)
  const ranges = []
  let index = text.indexOf(snippet)
  while (-1 !== index) {
    ranges.push({
      from: positions[index],
      to: positions[index + snippet.length - 1] + 1,
    })
    index = text.indexOf(snippet, index + 1)
  }
  return ranges
}

// The total extent (earliest start to latest end) of each given commentId's
// marks in the document. Used to find the innermost thread under a click.
function commentExtents(doc, commentIds) {
  const extents = {}
  doc.descendants((node, pos) => {
    if (!node.isText) {
      return
    }
    node.marks.forEach((mark) => {
      const id = mark.attrs?.commentId
      if (!commentIds.includes(id)) {
        return
      }
      const extent = (extents[id] ??= { from: Infinity, to: -Infinity })
      extent.from = Math.min(extent.from, pos)
      extent.to = Math.max(extent.to, pos + node.nodeSize)
    })
  })
  return extents
}

// Remove all comment marks from a pasted/copied fragment: comments must not
// silently multiply when their text is copied elsewhere (Google Docs behaviour).
function stripCommentMarks(fragment, markName) {
  const children = []
  fragment.forEach((node) => {
    let stripped = node.mark(node.marks.filter((mark) => mark.type.name !== markName))
    if (stripped.content.childCount) {
      stripped = stripped.copy(stripCommentMarks(stripped.content, markName))
    }
    children.push(stripped)
  })
  return Fragment.fromArray(children)
}

export const CommentMark = Mark.create({
  name: 'comment',

  // Typing right after a highlighted range should not extend the highlight.
  inclusive: false,

  // By default a mark type excludes itself, i.e. applying a second comment mark
  // would replace the first. Overlapping threads need them to coexist.
  excludes: '',

  addOptions() {
    return {
      // Called with the commentId when the user clicks highlighted text.
      onCommentClick: () => {},
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => {
          if (!attributes.commentId) {
            return {}
          }
          return { 'data-comment-id': attributes.commentId }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { class: 'comment-mark' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      0,
    ]
  },

  addCommands() {
    return {
      // Apply a comment mark over an explicit range (used when a draft is
      // committed and when a thread is re-anchored via its snippet).
      applyCommentMark:
        (commentId, from, to) =>
        ({ tr, state, dispatch }) => {
          if (from >= to) {
            return false
          }
          const markType = state.schema.marks[this.name]
          if (dispatch) {
            tr.addMark(from, to, markType.create({ commentId }))
            dispatch(tr)
          }
          return true
        },

      // Remove every mark with the given commentId from the whole document
      // (used when a thread is deleted or its anchor is cleared). Other comment
      // marks overlapping the same text are left untouched.
      unsetCommentMarkById:
        (commentId) =>
        ({ tr, state, dispatch }) => {
          const markType = state.schema.marks[this.name]
          let found = false
          state.doc.descendants((node, pos) => {
            if (!node.isText) {
              return
            }
            node.marks
              .filter(
                (mark) => mark.type === markType && mark.attrs.commentId === commentId
              )
              .forEach((mark) => {
                tr.removeMark(pos, pos + node.nodeSize, mark)
                found = true
              })
          })
          if (found && dispatch) {
            dispatch(tr)
          }
          return found
        },

      // Show the current selection as a pending (uncommitted) comment anchor.
      startCommentDraft:
        (anchorId) =>
        ({ tr, state, dispatch }) => {
          const { from, to } = state.selection
          if (from === to) {
            return false
          }
          if (dispatch) {
            tr.setMeta(CommentDraftKey, { anchorId, from, to })
            dispatch(tr)
          }
          return true
        },

      // Drop the pending draft without touching the document.
      cancelCommentDraft:
        () =>
        ({ tr, state, dispatch }) => {
          if (!CommentDraftKey.getState(state)) {
            return false
          }
          if (dispatch) {
            tr.setMeta(CommentDraftKey, null)
            dispatch(tr)
          }
          return true
        },

      // Turn the pending draft into a real, persisted comment mark. If the
      // drafted text was deleted while composing, the draft is just cleared
      // (the comment then lives on as an orphaned thread).
      commitCommentDraft:
        () =>
        ({ tr, state, dispatch }) => {
          const draft = CommentDraftKey.getState(state)
          if (!draft) {
            return false
          }
          const markType = state.schema.marks[this.name]
          if (dispatch) {
            if (draft.from < draft.to) {
              tr.addMark(
                draft.from,
                draft.to,
                markType.create({ commentId: draft.anchorId })
              )
            }
            tr.setMeta(CommentDraftKey, null)
            dispatch(tr)
          }
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const options = this.options
    const markName = this.name
    return [
      new Plugin({
        key: new PluginKey('commentMarkClick'),
        props: {
          handleClick: (view, pos) => {
            const { schema, doc } = view.state
            const markType = schema.marks[markName]
            const marks = doc
              .resolve(pos)
              .marks()
              .filter((mark) => mark.type === markType && mark.attrs.commentId)
            if (!marks.length) {
              return false
            }
            let commentId = marks[0].attrs.commentId
            if (marks.length > 1) {
              // Stacked highlights: focus the innermost (smallest) thread, like
              // Google Docs. The outer ones stay reachable via the panel.
              const extents = commentExtents(
                doc,
                marks.map((mark) => mark.attrs.commentId)
              )
              commentId = marks
                .map((mark) => mark.attrs.commentId)
                .sort(
                  (a, b) =>
                    extents[a].to - extents[a].from - (extents[b].to - extents[b].from)
                )[0]
            }
            options.onCommentClick(commentId)
            return false
          },
          // Comments don't travel with copied text (Google Docs behaviour) —
          // otherwise pasting would duplicate anchors and break the 1:1 mapping
          // between a thread and its highlight.
          transformPasted: (slice) =>
            new Slice(
              stripCommentMarks(slice.content, markName),
              slice.openStart,
              slice.openEnd
            ),
        },
      }),
      new Plugin({
        key: CommentDraftKey,
        state: {
          init: () => null,
          apply: (tr, draft) => {
            const meta = tr.getMeta(CommentDraftKey)
            if (undefined !== meta) {
              return meta
            }
            if (!draft) {
              return null
            }
            // Follow document edits while composing; assoc mirrors the mark's
            // inclusive:false (typing at the edges doesn't grow the range).
            return {
              ...draft,
              from: tr.mapping.map(draft.from, 1),
              to: tr.mapping.map(draft.to, -1),
            }
          },
        },
        props: {
          decorations(state) {
            const draft = CommentDraftKey.getState(state)
            if (!draft || draft.from >= draft.to) {
              return null
            }
            return DecorationSet.create(state.doc, [
              Decoration.inline(draft.from, draft.to, {
                class: 'comment-mark comment-mark--draft',
                'data-comment-id': draft.anchorId,
              }),
            ])
          },
        },
      }),
    ]
  },
})
