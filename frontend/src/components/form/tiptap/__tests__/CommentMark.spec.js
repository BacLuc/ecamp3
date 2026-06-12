import { afterEach, describe, expect, it, vi } from 'vitest'
import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import {
  CommentMark,
  CommentDraftKey,
  findSnippetRanges,
} from '@/components/form/tiptap/CommentMark.js'

describe('CommentMark', () => {
  let editor

  afterEach(() => {
    editor?.destroy()
    editor = null
  })

  const createEditor = (content, onCommentClick = () => {}) =>
    new Editor({
      extensions: [Document, Paragraph, Text, CommentMark.configure({ onCommentClick })],
      content,
    })

  describe('serialization', () => {
    it('round-trips comment anchors through HTML', () => {
      editor = createEditor('<p>one <span data-comment-id="a1">two</span> three</p>')
      expect(editor.getHTML()).toContain('data-comment-id="a1"')
      expect(editor.getText()).toBe('one two three')
    })
  })

  describe('overlapping threads', () => {
    it('lets two comment marks coexist on the same text', () => {
      editor = createEditor('<p>abcdef</p>')
      editor.commands.applyCommentMark('outer', 1, 7)
      editor.commands.applyCommentMark('inner', 3, 5)

      const html = editor.getHTML()
      expect(html).toContain('data-comment-id="outer"')
      expect(html).toContain('data-comment-id="inner"')
    })

    it('unsetCommentMarkById removes only the given thread, keeping overlapping ones', () => {
      editor = createEditor('<p>abcdef</p>')
      editor.commands.applyCommentMark('outer', 1, 7)
      editor.commands.applyCommentMark('inner', 3, 5)

      editor.commands.unsetCommentMarkById('inner')

      const html = editor.getHTML()
      expect(html).not.toContain('data-comment-id="inner"')
      expect(html).toContain('data-comment-id="outer"')
      // the outer thread still spans the full original range
      expect(findSnippetRanges(editor.state.doc, 'abcdef')).toEqual([{ from: 1, to: 7 }])
    })

    it('clicking stacked highlights focuses the innermost thread', () => {
      const onCommentClick = vi.fn()
      editor = createEditor('<p>abcdef</p>', onCommentClick)
      editor.commands.applyCommentMark('outer', 1, 7)
      editor.commands.applyCommentMark('inner', 3, 5)

      // invoke the plugin's handleClick on a position inside both ranges
      editor.view.someProp('handleClick', (f) => f(editor.view, 4, {}))

      expect(onCommentClick).toHaveBeenCalledWith('inner')
    })
  })

  describe('paste behaviour', () => {
    it('strips comment marks from pasted content', () => {
      editor = createEditor('<p>target</p>')
      const source = createEditor(
        '<p>plain <span data-comment-id="a1">commented</span> tail</p>'
      )
      const slice = source.state.doc.slice(0, source.state.doc.content.size)

      const transformed = editor.view.someProp('transformPasted', (f) =>
        f(slice, editor.view)
      )

      let hasCommentMark = false
      transformed.content.descendants((node) => {
        if (node.marks.some((mark) => mark.type.name === 'comment')) {
          hasCommentMark = true
        }
      })
      expect(hasCommentMark).toBe(false)
      expect(transformed.content.textBetween(0, transformed.content.size, ' ')).toContain(
        'commented'
      )
      source.destroy()
    })
  })

  describe('draft lifecycle', () => {
    it('startCommentDraft records the selection as a pending draft, without marking', () => {
      editor = createEditor('<p>abcdef</p>')
      editor.commands.setTextSelection({ from: 2, to: 5 })

      const started = editor.commands.startCommentDraft('draft-1')

      expect(started).toBe(true)
      expect(CommentDraftKey.getState(editor.state)).toEqual({
        anchorId: 'draft-1',
        from: 2,
        to: 5,
      })
      // nothing persisted: the document HTML carries no anchor
      expect(editor.getHTML()).not.toContain('data-comment-id')
    })

    it('refuses to start a draft on an empty selection', () => {
      editor = createEditor('<p>abcdef</p>')
      editor.commands.setTextSelection({ from: 3, to: 3 })

      expect(editor.commands.startCommentDraft('draft-1')).toBe(false)
      expect(CommentDraftKey.getState(editor.state)).toBe(null)
    })

    it('the draft range follows document edits while composing', () => {
      editor = createEditor('<p>abcdef</p>')
      editor.commands.setTextSelection({ from: 3, to: 5 })
      editor.commands.startCommentDraft('draft-1')

      // insert text before the draft: the range must shift right
      editor.commands.insertContentAt(1, 'XX')

      expect(CommentDraftKey.getState(editor.state)).toEqual({
        anchorId: 'draft-1',
        from: 5,
        to: 7,
      })
    })

    it('commitCommentDraft turns the draft into a real mark at the tracked range', () => {
      editor = createEditor('<p>abcdef</p>')
      editor.commands.setTextSelection({ from: 3, to: 5 })
      editor.commands.startCommentDraft('draft-1')
      editor.commands.insertContentAt(1, 'XX')

      editor.commands.commitCommentDraft()

      expect(CommentDraftKey.getState(editor.state)).toBe(null)
      expect(editor.getHTML()).toContain('data-comment-id="draft-1"')
      // the mark covers the shifted range (original characters c-d)
      expect(findSnippetRanges(editor.state.doc, 'cd')).toEqual([{ from: 5, to: 7 }])
    })

    it('cancelCommentDraft drops the draft without touching the document', () => {
      editor = createEditor('<p>abcdef</p>')
      editor.commands.setTextSelection({ from: 3, to: 5 })
      editor.commands.startCommentDraft('draft-1')

      editor.commands.cancelCommentDraft()

      expect(CommentDraftKey.getState(editor.state)).toBe(null)
      expect(editor.getHTML()).not.toContain('data-comment-id')
    })

    it('commits nothing when the drafted text was deleted while composing', () => {
      editor = createEditor('<p>abcdef</p>')
      editor.commands.setTextSelection({ from: 3, to: 5 })
      editor.commands.startCommentDraft('draft-1')

      editor.commands.deleteRange({ from: 3, to: 5 })
      editor.commands.commitCommentDraft()

      expect(CommentDraftKey.getState(editor.state)).toBe(null)
      expect(editor.getHTML()).not.toContain('data-comment-id')
    })
  })

  describe('findSnippetRanges', () => {
    it('finds a snippet within a paragraph', () => {
      editor = createEditor('<p>the quick brown fox</p>')
      expect(findSnippetRanges(editor.state.doc, 'quick brown')).toEqual([
        { from: 5, to: 16 },
      ])
    })

    it('finds a snippet spanning formatting boundaries', () => {
      editor = createEditor('<p>one <span data-comment-id="x">two</span> three</p>')
      expect(findSnippetRanges(editor.state.doc, 'one two three')).toHaveLength(1)
    })

    it('treats paragraph breaks as newlines, matching textBetween snapshots', () => {
      editor = createEditor('<p>first line</p><p>second line</p>')
      const snippet = editor.state.doc.textBetween(3, 18, '\n')
      expect(snippet).toContain('\n')
      expect(findSnippetRanges(editor.state.doc, snippet)).toHaveLength(1)
    })

    it('returns every occurrence so ambiguity can be detected', () => {
      editor = createEditor('<p>echo and echo</p>')
      expect(findSnippetRanges(editor.state.doc, 'echo')).toHaveLength(2)
    })

    it('returns nothing for an absent or empty snippet', () => {
      editor = createEditor('<p>abc</p>')
      expect(findSnippetRanges(editor.state.doc, 'zzz')).toEqual([])
      expect(findSnippetRanges(editor.state.doc, '')).toEqual([])
    })
  })
})
