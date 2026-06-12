import { describe, it, expect, vi } from 'vitest'
import { createCommentsController } from '@/components/comments/commentsController.js'

const editor = (overrides = {}) => ({
  scrollToComment: vi.fn(),
  removeCommentMark: vi.fn(),
  hasAnchor: vi.fn(() => false),
  findSnippetRanges: vi.fn(() => []),
  applyAnchor: vi.fn(),
  applyAnchorToSelection: vi.fn(() => 'selected text'),
  commitDraft: vi.fn(),
  cancelDraft: vi.fn(),
  ...overrides,
})

describe('commentsController', () => {
  it('starts closed with no active comment or draft', () => {
    const c = createCommentsController()
    expect(c.open).toBe(false)
    expect(c.activeCommentId).toBe(null)
    expect(c.draft).toBe(null)
    expect(c.allAnchorIds).toEqual([])
    expect(c.pendingAnchorIds).toEqual([])
    expect(c.commentsLoaded).toBe(false)
  })

  describe('editor registration', () => {
    it('fans scrollToAnchor out to every editor registered for a content node', () => {
      const c = createCommentsController()
      const a = editor()
      const b = editor()
      // A storyboard hosts several editors under the same content-node IRI.
      c.registerEditor('/content_node/storyboards/1', a)
      c.registerEditor('/content_node/storyboards/1', b)

      c.scrollToAnchor('/content_node/storyboards/1', 'anchor-1')

      expect(a.scrollToComment).toHaveBeenCalledWith('anchor-1')
      expect(b.scrollToComment).toHaveBeenCalledWith('anchor-1')
    })

    it('fans removeAnchor out to every editor registered for a content node', () => {
      const c = createCommentsController()
      const a = editor()
      const b = editor()
      c.registerEditor('/n/1', a)
      c.registerEditor('/n/1', b)

      c.removeAnchor('/n/1', 'anchor-1')

      expect(a.removeCommentMark).toHaveBeenCalledWith('anchor-1')
      expect(b.removeCommentMark).toHaveBeenCalledWith('anchor-1')
    })

    it('only unregisters the given editor instance, leaving siblings registered', () => {
      const c = createCommentsController()
      const a = editor()
      const b = editor()
      c.registerEditor('/n/1', a)
      c.registerEditor('/n/1', b)

      c.unregisterEditor('/n/1', a)
      c.scrollToAnchor('/n/1', 'x')

      expect(a.scrollToComment).not.toHaveBeenCalled()
      expect(b.scrollToComment).toHaveBeenCalledWith('x')
    })

    it('does nothing when no editor is registered for a content node', () => {
      const c = createCommentsController()
      expect(() => c.scrollToAnchor('/unknown', 'x')).not.toThrow()
      expect(() => c.removeAnchor('/unknown', 'x')).not.toThrow()
    })
  })

  describe('draft lifecycle', () => {
    it('beginThread opens the panel and activates the pending anchor', () => {
      const c = createCommentsController()
      const started = c.beginThread({
        contentNodeUri: '/n/1',
        anchorId: 'anchor-1',
        anchorText: 'some text',
      })

      expect(started).toBe(true)
      expect(c.draft).toEqual({
        contentNodeUri: '/n/1',
        anchorId: 'anchor-1',
        anchorText: 'some text',
      })
      expect(c.activeCommentId).toBe('anchor-1')
      expect(c.open).toBe(true)
    })

    it('beginThread replaces a previous draft the user has not typed into', () => {
      const c = createCommentsController()
      const a = editor()
      c.registerEditor('/n/1', a)
      c.beginThread({ contentNodeUri: '/n/1', anchorId: 'anchor-1', anchorText: 'x' })

      const started = c.beginThread({
        contentNodeUri: '/n/2',
        anchorId: 'anchor-2',
        anchorText: 'y',
      })

      expect(started).toBe(true)
      // the stale draft's decoration is cleared in its editor
      expect(a.cancelDraft).toHaveBeenCalled()
      expect(c.draft.anchorId).toBe('anchor-2')
    })

    it('beginThread refuses while a draft with typed text is open, and focuses it', () => {
      const c = createCommentsController()
      c.beginThread({ contentNodeUri: '/n/1', anchorId: 'anchor-1', anchorText: 'x' })
      c.draftHasText = true
      c.open = false

      const started = c.beginThread({
        contentNodeUri: '/n/2',
        anchorId: 'anchor-2',
        anchorText: 'y',
      })

      expect(started).toBe(false)
      expect(c.draft.anchorId).toBe('anchor-1')
      expect(c.activeCommentId).toBe('anchor-1')
      expect(c.open).toBe(true)
    })

    it('cancelDraft clears the decoration and the draft state', () => {
      const c = createCommentsController()
      const a = editor()
      c.registerEditor('/n/1', a)
      c.beginThread({ contentNodeUri: '/n/1', anchorId: 'anchor-1', anchorText: 'x' })

      c.cancelDraft()

      expect(a.cancelDraft).toHaveBeenCalled()
      expect(c.draft).toBe(null)
      expect(c.draftHasText).toBe(false)
      expect(c.activeCommentId).toBe(null)
    })

    it('commitDraft commits the decoration in the editors and parks the anchor as pending', () => {
      const c = createCommentsController()
      const a = editor()
      c.registerEditor('/n/1', a)
      c.beginThread({ contentNodeUri: '/n/1', anchorId: 'anchor-1', anchorText: 'x' })

      c.commitDraft()

      expect(a.commitDraft).toHaveBeenCalled()
      expect(c.draft).toBe(null)
      // pending guards the freshly committed mark against the reconcile sweep
      // until the reloaded comments collection contains the new thread
      expect(c.pendingAnchorIds).toEqual(['anchor-1'])
    })
  })

  describe('focus', () => {
    it('focusComment activates the comment and opens the panel', () => {
      const c = createCommentsController()
      c.focusComment('comment-iri')

      expect(c.activeCommentId).toBe('comment-iri')
      expect(c.open).toBe(true)
    })

    it('setActive changes the active comment without forcing the panel open', () => {
      const c = createCommentsController()
      c.setActive('comment-iri')

      expect(c.activeCommentId).toBe('comment-iri')
      expect(c.open).toBe(false)
    })

    it('focusComment ignores clicks on orphaned highlights once comments are loaded', () => {
      const c = createCommentsController()
      c.commentsLoaded = true
      c.allAnchorIds = ['known-anchor']

      c.focusComment('orphan-anchor')
      expect(c.activeCommentId).toBe(null)
      expect(c.open).toBe(false)

      c.focusComment('known-anchor')
      expect(c.activeCommentId).toBe('known-anchor')
      expect(c.open).toBe(true)
    })

    it('focusComment trusts the click while comments are still loading', () => {
      const c = createCommentsController()
      // commentsLoaded is false: we can't yet tell orphans apart, so allow it.
      c.focusComment('anchor-x')
      expect(c.activeCommentId).toBe('anchor-x')
      expect(c.open).toBe(true)
    })
  })

  describe('re-anchoring', () => {
    const anchored = (overrides = {}) => ({
      anchorId: 'anchor-1',
      anchorText: 'lost sentence',
      open: true,
      ...overrides,
    })

    const loadedController = (anchor) => {
      const c = createCommentsController()
      c.commentsLoaded = true
      c.anchorsByNode = { '/n/1': [anchor] }
      return c
    }

    it('re-applies the mark when the snippet matches exactly once', () => {
      const c = loadedController(anchored())
      const a = editor({ findSnippetRanges: vi.fn(() => [{ from: 3, to: 16 }]) })
      c.registerEditor('/n/1', a)

      c.reanchorContentNode('/n/1')

      expect(a.applyAnchor).toHaveBeenCalledWith('anchor-1', { from: 3, to: 16 })
    })

    it('does nothing while the thread still has its mark somewhere', () => {
      const c = loadedController(anchored())
      const a = editor({ hasAnchor: vi.fn(() => true) })
      c.registerEditor('/n/1', a)

      c.reanchorContentNode('/n/1')

      expect(a.findSnippetRanges).not.toHaveBeenCalled()
      expect(a.applyAnchor).not.toHaveBeenCalled()
    })

    it('leaves the thread orphaned when the snippet is ambiguous (multiple matches)', () => {
      const c = loadedController(anchored())
      const a = editor({
        findSnippetRanges: vi.fn(() => [
          { from: 3, to: 16 },
          { from: 20, to: 33 },
        ]),
      })
      c.registerEditor('/n/1', a)

      c.reanchorContentNode('/n/1')

      expect(a.applyAnchor).not.toHaveBeenCalled()
    })

    it('treats matches across sibling editors of the same node as ambiguous', () => {
      const c = loadedController(anchored())
      const a = editor({ findSnippetRanges: vi.fn(() => [{ from: 1, to: 5 }]) })
      const b = editor({ findSnippetRanges: vi.fn(() => [{ from: 2, to: 6 }]) })
      c.registerEditor('/n/1', a)
      c.registerEditor('/n/1', b)

      c.reanchorContentNode('/n/1')

      expect(a.applyAnchor).not.toHaveBeenCalled()
      expect(b.applyAnchor).not.toHaveBeenCalled()
    })

    it('re-anchors in the sibling editor that holds the unique match', () => {
      const c = loadedController(anchored())
      const a = editor()
      const b = editor({ findSnippetRanges: vi.fn(() => [{ from: 2, to: 6 }]) })
      c.registerEditor('/n/1', a)
      c.registerEditor('/n/1', b)

      c.reanchorContentNode('/n/1')

      expect(a.applyAnchor).not.toHaveBeenCalled()
      expect(b.applyAnchor).toHaveBeenCalledWith('anchor-1', { from: 2, to: 6 })
    })

    it('skips resolved threads and threads without a snippet', () => {
      const c = createCommentsController()
      c.commentsLoaded = true
      c.anchorsByNode = {
        '/n/1': [
          anchored({ anchorId: 'resolved-one', open: false }),
          anchored({ anchorId: 'no-snippet', anchorText: null }),
        ],
      }
      const a = editor({ findSnippetRanges: vi.fn(() => [{ from: 1, to: 5 }]) })
      c.registerEditor('/n/1', a)

      c.reanchorContentNode('/n/1')

      expect(a.applyAnchor).not.toHaveBeenCalled()
    })

    it('does nothing before the comments collection has loaded', () => {
      const c = createCommentsController()
      c.anchorsByNode = { '/n/1': [anchored()] }
      const a = editor({ findSnippetRanges: vi.fn(() => [{ from: 1, to: 5 }]) })
      c.registerEditor('/n/1', a)

      c.reanchorContentNode('/n/1')

      expect(a.applyAnchor).not.toHaveBeenCalled()
    })
  })

  describe('manual re-anchoring to a selection', () => {
    it('tracks which editor holds a selection', () => {
      const c = createCommentsController()
      const a = editor()
      c.registerEditor('/n/1', a)

      expect(c.hasSelection).toBe(false)
      c.reportSelection('/n/1', a, true)
      expect(c.hasSelection).toBe(true)
      c.reportSelection('/n/1', a, false)
      expect(c.hasSelection).toBe(false)
    })

    it('an editor reporting empty does not clear another editor’s selection', () => {
      const c = createCommentsController()
      const a = editor()
      const b = editor()
      c.registerEditor('/n/1', a)
      c.registerEditor('/n/2', b)

      c.reportSelection('/n/1', a, true)
      c.reportSelection('/n/2', b, false)

      expect(c.hasSelection).toBe(true)
    })

    it('unregistering the selection-holding editor clears the selection', () => {
      const c = createCommentsController()
      const a = editor()
      c.registerEditor('/n/1', a)
      c.reportSelection('/n/1', a, true)

      c.unregisterEditor('/n/1', a)

      expect(c.hasSelection).toBe(false)
    })

    it('re-anchors the thread onto the selection and reports the new anchor', () => {
      const c = createCommentsController()
      const a = editor()
      c.registerEditor('/n/2', a)
      c.reportSelection('/n/2', a, true)

      const result = c.reanchorToSelection({
        anchorId: 'anchor-1',
        contentNodeUri: '/n/1',
      })

      expect(a.applyAnchorToSelection).toHaveBeenCalledWith('anchor-1')
      expect(result).toEqual({ contentNodeUri: '/n/2', anchorText: 'selected text' })
    })

    it('returns null when no editor holds a selection', () => {
      const c = createCommentsController()
      const result = c.reanchorToSelection({
        anchorId: 'anchor-1',
        contentNodeUri: '/n/1',
      })
      expect(result).toBe(null)
    })

    it('returns null when the selection collapsed before the click', () => {
      const c = createCommentsController()
      const a = editor({ applyAnchorToSelection: vi.fn(() => null) })
      c.registerEditor('/n/1', a)
      c.reportSelection('/n/1', a, true)

      expect(
        c.reanchorToSelection({ anchorId: 'anchor-1', contentNodeUri: '/n/1' })
      ).toBe(null)
    })
  })
})
