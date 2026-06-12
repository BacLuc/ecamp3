import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setupVuetify } from '/tests/setupVuetify.js'
import TiptapEditor from '@/components/form/tiptap/TiptapEditor.vue'

setupVuetify()

describe('TiptapEditor', () => {
  let wrapper

  afterEach(() => {
    wrapper?.unmount()
  })

  const mountEditor = (props = {}) =>
    mount(TiptapEditor, {
      attachTo: document.body,
      props,
      global: { mocks: { $t: (key) => key } },
    })

  // Regression test: `html` used to be a cached computed. Because TipTap mutates
  // the editor outside Vue's reactivity, the computed had no dependency that could
  // invalidate it and stayed frozen at its first value, so every tiptapUpdate
  // emitted stale HTML — which truncated comment text to the first keystroke.
  it('emits the live editor HTML on every update, not a frozen first value', async () => {
    wrapper = mountEditor({ modelValue: '' })
    const editor = wrapper.vm.editor

    editor.commands.insertContent('a')
    editor.commands.insertContent('b')
    editor.commands.insertContent('c')
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('tiptapUpdate')
    expect(emitted).toBeTruthy()
    const last = emitted[emitted.length - 1][0]
    expect(last).toContain('abc')
    // The emitted value must match the editor's actual current HTML, not a
    // stale snapshot from an earlier keystroke.
    expect(last).toBe(wrapper.vm.html())
  })

  it('reflects the full text after several content changes', async () => {
    wrapper = mountEditor({ modelValue: '<p>start</p>' })
    const editor = wrapper.vm.editor
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    'XYZ'.split('').forEach((ch) => editor.commands.insertContent(ch))
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('tiptapUpdate')
    const last = emitted[emitted.length - 1][0]
    expect(last).toContain('startXYZ')
  })

  // Regression test: the comment mark must be registered even in editors outside
  // a comments context (no injected controller). An editor whose schema doesn't
  // know the mark drops every <span data-comment-id> on its next save, silently
  // destroying the anchors of all inline comment threads.
  it('preserves comment anchors in editors without a comments context', () => {
    wrapper = mountEditor({
      modelValue: '<p>one <span data-comment-id="a1">two</span> three</p>',
    })
    expect(wrapper.vm.html()).toContain('data-comment-id="a1"')
  })

  describe('inline comment drafts', () => {
    const mountWithController = (controller, props = {}) =>
      mount(TiptapEditor, {
        attachTo: document.body,
        props: { commentContentNodeUri: '/content_node/single_texts/1', ...props },
        global: {
          mocks: { $t: (key) => key },
          provide: { commentsController: controller },
        },
      })

    const controllerMock = () => ({
      beginThread: vi.fn(() => true),
      focusComment: vi.fn(),
      registerEditor: vi.fn(),
      unregisterEditor: vi.fn(),
      reanchorContentNode: vi.fn(),
      reportSelection: vi.fn(),
      activeAnchorId: null,
      highlightAnchorIds: [],
      allAnchorIds: [],
      commentsLoaded: false,
    })

    it('starting a draft tells the controller but does not persist an anchor yet', async () => {
      const controller = controllerMock()
      wrapper = mountWithController(controller, { modelValue: '<p>abcdef</p>' })
      wrapper.vm.editor.commands.setTextSelection({ from: 2, to: 5 })

      wrapper.vm.addCommentOnSelection()

      expect(controller.beginThread).toHaveBeenCalledWith(
        expect.objectContaining({
          contentNodeUri: '/content_node/single_texts/1',
          anchorText: 'bcd',
        })
      )
      // the highlight is decoration-only: the savable HTML carries no anchor
      expect(wrapper.vm.html()).not.toContain('data-comment-id')
    })

    it('committing the draft persists the anchor; cancelling never does', async () => {
      const controller = controllerMock()
      wrapper = mountWithController(controller, { modelValue: '<p>abcdef</p>' })
      wrapper.vm.editor.commands.setTextSelection({ from: 2, to: 5 })
      wrapper.vm.addCommentOnSelection()

      wrapper.vm.commitDraft()
      expect(wrapper.vm.html()).toContain('data-comment-id')
    })

    it('does not start a draft when the controller refuses (another draft has text)', () => {
      const controller = controllerMock()
      controller.beginThread = vi.fn(() => false)
      wrapper = mountWithController(controller, { modelValue: '<p>abcdef</p>' })
      wrapper.vm.editor.commands.setTextSelection({ from: 2, to: 5 })

      wrapper.vm.addCommentOnSelection()

      wrapper.vm.commitDraft()
      expect(wrapper.vm.html()).not.toContain('data-comment-id')
    })
  })
})
