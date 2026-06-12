<template>
  <CommentWrapper v-if="!comments._meta.loading">
    <slot />
    <template #comments>
      <!-- Wide screens: anchored threads float in the margin next to their text. -->
      <div
        v-if="marginMode"
        ref="margin"
        class="ec-comment-margin"
        :style="{ minHeight: layout.height }"
      >
        <div
          v-for="card in layout.cards"
          :key="card.key"
          :ref="(el) => registerCardEl(card.key, el)"
          class="ec-comment-card"
          :class="{ 'ec-comment-card--active': card.active }"
          :style="{ transform: `translateY(${card.top}px)` }"
        >
          <!-- Threads are looked up by key at render time (not captured in the
               layout) so replies and edits show up without the layout noticing. -->
          <CommentThread
            v-if="card.draft && controller.draft"
            :draft="controller.draft"
            :activity="activity"
          />
          <CommentThread
            v-else-if="threadsByKey[card.key]"
            :thread="threadsByKey[card.key]"
            :activity="activity"
          />
        </div>
      </div>

      <!-- Narrow screens (drawer): a stacked list of all open threads, anchored
           ones first in document order (like the Google Docs mobile sheet). -->
      <template v-else>
        <CommentThread
          v-if="controller.draft"
          :draft="controller.draft"
          :activity="activity"
          show-quote
        />
        <CommentThread
          v-for="thread in orderedOpenThreads"
          :key="thread.root._meta.self"
          :thread="thread"
          :activity="activity"
          :orphaned="!!thread.anchorId && !anchorElement(thread.anchorId)"
          show-quote
        />
      </template>

      <!-- General section: non-anchored / orphaned threads (margin mode only),
           the activity-level composer, and the collapsed resolved threads. -->
      <div class="ec-comment-general d-flex flex-column gap-2 mt-2">
        <template v-for="uri in marginMode ? layout.unanchored : []" :key="uri">
          <CommentThread
            v-if="threadsByKey[uri]"
            :thread="threadsByKey[uri]"
            :activity="activity"
            :orphaned="!!threadsByKey[uri].anchorId"
            show-quote
          />
        </template>

        <p
          v-if="!threads.length && !controller.draft"
          class="text-caption text-medium-emphasis text-center mb-0"
        >
          {{ $t('components.comments.noComments') }}
        </p>

        <v-sheet border rounded="lg" elevation="1" class="ec-comment-new pa-3 w-100">
          <e-richtext
            :key="composerKey"
            vee-id="comment-new"
            class="e-story-day e-story-day--textmode"
            :placeholder="$t('components.comments.placeholder')"
            @update:model-value="onInput"
          />
          <div class="d-flex align-center justify-space-between mt-2 gap-2">
            <span class="text-caption d-flex align-center">
              <UserAvatar v-if="authUser" :user="authUser" size="20" class="mr-1" />
              {{ authUser.displayName }}
            </span>
            <v-btn
              variant="text"
              size="small"
              color="primary"
              :loading="saving"
              :disabled="newComment.length === 0"
              @click="addComment"
            >
              {{ $t('components.comments.send') }}
            </v-btn>
          </div>
        </v-sheet>

        <v-expansion-panels v-if="resolvedThreads.length" flat class="w-100">
          <v-expansion-panel
            :title="
              $t('components.comments.resolvedCount', { count: resolvedThreads.length })
            "
          >
            <template #text>
              <CommentThread
                v-for="thread in resolvedThreads"
                :key="thread.root._meta.self"
                :thread="thread"
                :activity="activity"
                show-quote
                class="mb-2"
              />
            </template>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </template>
  </CommentWrapper>
</template>

<script>
import { provide } from 'vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import CommentWrapper from '@/components/comments/CommentWrapper.vue'
import CommentThread from '@/components/comments/CommentThread.vue'
import { createCommentsController } from '@/components/comments/commentsController.js'
import { mapGetters } from 'vuex'

// Vertical gap between stacked comment cards in the margin.
const CARD_GAP = 8

export default {
  name: 'Comments',
  components: {
    UserAvatar,
    CommentWrapper,
    CommentThread,
  },
  props: {
    activityId: {
      type: String,
      required: true,
    },
  },
  setup() {
    const controller = createCommentsController()
    provide('commentsController', controller)
    return { controller }
  },
  data() {
    return {
      newComment: '',
      saving: false,
      // Bumped after sending to remount (and thus clear) the composer editor.
      composerKey: 0,
      // Computed margin layout: positioned anchored cards, plus the threads that
      // couldn't be anchored (shown in the general section).
      layout: { cards: [], unanchored: [], height: '0px' },
      // Drawer mode: root IRI -> vertical position of its anchor, for document-
      // order sorting of the thread list.
      drawerOrder: {},
    }
  },
  computed: {
    ...mapGetters({
      authUser: 'getLoggedInUser',
    }),
    activity() {
      return this.api.get().activities({ id: this.activityId })
    },
    comments() {
      return this.activity.comments()
    },
    // Anchored comments are only floated in the margin when there's room for it.
    marginMode() {
      return this.$vuetify.display.width > 1360
    },
    // Live lookup for the margin layout: the layout stores only thread keys, so
    // cards always render the current thread data (replies, edits) even when
    // the layout itself didn't change.
    threadsByKey() {
      const map = {}
      for (const thread of this.threads) {
        map[thread.root._meta.self] = thread
      }
      return map
    },
    threads() {
      const all = this.comments.items
      const roots = all.filter((comment) => !this.parentUri(comment))
      return roots.map((root) => ({
        root,
        anchorId: root.anchorId,
        anchorText: root.anchorText,
        contentNode: root.contentNode,
        resolved: !!root.resolvedAt,
        replies: all
          .filter((comment) => this.parentUri(comment) === root._meta.self)
          .sort((a, b) => (a.createTime < b.createTime ? -1 : 1)),
      }))
    },
    openThreads() {
      return this.threads.filter((thread) => !thread.resolved)
    },
    // Drawer mode: anchored threads in document order (like the Google Docs
    // sidebar), threads whose anchor can't be found after them in creation order.
    orderedOpenThreads() {
      const order = this.drawerOrder
      return [...this.openThreads].sort(
        (a, b) =>
          (order[a.root._meta.self] ?? Infinity) - (order[b.root._meta.self] ?? Infinity)
      )
    },
    resolvedThreads() {
      return this.threads.filter((thread) => thread.resolved)
    },
    // Anchor data per content node, for the editors' re-anchoring pass.
    anchorsByNode() {
      const map = {}
      for (const thread of this.threads) {
        const uri = thread.contentNode?.()?._meta?.self
        if (!uri || !thread.anchorId) {
          continue
        }
        ;(map[uri] ??= []).push({
          anchorId: thread.anchorId,
          anchorText: thread.anchorText,
          open: !thread.resolved,
        })
      }
      return map
    },
    // Anchors that should be highlighted: open threads, the active draft, and
    // just-committed drafts whose comment is still being reloaded. Resolved
    // threads and orphaned marks are intentionally excluded.
    highlightAnchorIds() {
      const ids = this.openThreads.map((thread) => thread.anchorId)
      if (this.controller.draft?.anchorId) {
        ids.push(this.controller.draft.anchorId)
      }
      ids.push(...this.controller.pendingAnchorIds)
      return ids.filter(Boolean)
    },
    // Every anchor that still maps to a comment (open or resolved), the draft,
    // and just-committed drafts. Editors use this to recognise and strip
    // orphaned highlight spans.
    allAnchorIds() {
      const ids = this.threads.map((thread) => thread.anchorId)
      if (this.controller.draft?.anchorId) {
        ids.push(this.controller.draft.anchorId)
      }
      ids.push(...this.controller.pendingAnchorIds)
      return ids.filter(Boolean)
    },
    commentsLoaded() {
      return !this.comments._meta.loading
    },
    // The anchorId of the focused thread, whether it was focused via its highlight
    // (activeCommentId === anchorId) or via its card (activeCommentId === root IRI).
    activeAnchorId() {
      const id = this.controller.activeCommentId
      if (!id) {
        return null
      }
      if (this.controller.draft?.anchorId === id) {
        return id
      }
      const thread = this.threads.find(
        (t) => t.anchorId === id || t.root._meta.self === id
      )
      return thread?.anchorId ?? null
    },
  },
  watch: {
    openThreads() {
      this.scheduleLayout()
    },
    // Once a just-committed draft's comment has arrived in the collection, its
    // anchorId no longer needs the pending grace entry (see commitDraft).
    threads(threads) {
      const arrived = new Set(threads.map((thread) => thread.anchorId))
      if (this.controller.pendingAnchorIds.some((id) => arrived.has(id))) {
        this.controller.pendingAnchorIds = this.controller.pendingAnchorIds.filter(
          (id) => !arrived.has(id)
        )
      }
    },
    'controller.draft'() {
      this.scheduleLayout()
    },
    'controller.activeCommentId'() {
      this.scheduleLayout()
    },
    'controller.open'() {
      this.scheduleLayout()
    },
    marginMode() {
      this.scheduleLayout()
    },
    // Mirror the derived highlight state onto the controller so the editors (which
    // only know anchorIds) can show/hide highlights for active and resolved threads.
    activeAnchorId: {
      handler(value) {
        this.controller.activeAnchorId = value
      },
      immediate: true,
    },
    highlightAnchorIds: {
      handler(value) {
        this.controller.highlightAnchorIds = value
      },
      immediate: true,
    },
    allAnchorIds: {
      handler(value) {
        this.controller.allAnchorIds = value
      },
      immediate: true,
    },
    anchorsByNode: {
      handler(value) {
        this.controller.anchorsByNode = value
      },
      immediate: true,
    },
    commentsLoaded: {
      handler(value) {
        this.controller.commentsLoaded = value
      },
      immediate: true,
    },
  },
  created() {
    this.controller.reload = () => this.comments.$reload()
    // Non-reactive: DOM nodes of the rendered cards, keyed by card key.
    this.cardEls = {}
    this.resizeObserver = null
    this.layoutScheduled = false
    this.layoutTimeout = null
    this.layoutSignature = null
    this.drawerOrderSignature = null
  },
  mounted() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleLayout())
    }
    window.addEventListener('resize', this.scheduleLayout, { passive: true })
    this.scheduleLayout()
  },
  updated() {
    // Re-run after any re-render (comments loading in, threads changing, the panel
    // opening). The signature guard in computeLayout stops this from looping.
    this.scheduleLayout()
  },
  beforeUnmount() {
    // Drop a still-open draft so its highlight doesn't linger as an orphan. Child
    // editors are still mounted at this point, so the mark removal reaches them;
    // anything that slips through is cleaned up by reconcile on the next load.
    this.controller.cancelDraft()
    window.removeEventListener('resize', this.scheduleLayout)
    this.resizeObserver?.disconnect()
    clearTimeout(this.layoutTimeout)
    this.layoutScheduled = false
  },
  methods: {
    parentUri(comment) {
      return comment.parent?.()?._meta?.self ?? null
    },
    onInput(newValue) {
      this.newComment = newValue
    },
    registerCardEl(key, el) {
      if (el) {
        this.cardEls[key] = el
      } else {
        delete this.cardEls[key]
      }
    },
    scheduleLayout() {
      if (this.layoutScheduled) {
        return
      }
      this.layoutScheduled = true
      const run = () => {
        if (!this.layoutScheduled) {
          return
        }
        this.layoutScheduled = false
        clearTimeout(this.layoutTimeout)
        this.computeLayout()
      }
      // Prefer two animation frames so we measure after Vue has patched the DOM
      // and the browser has reflowed (e.g. the content column narrowing when the
      // panel opens). Fall back to a timeout in case rAF is throttled (background
      // tab), so the layout still settles. Whichever fires first wins.
      requestAnimationFrame(() => requestAnimationFrame(run))
      this.layoutTimeout = setTimeout(run, 120)
    },
    // Find the highlighted span for an anchor id, anywhere in the activity content.
    anchorElement(anchorId) {
      if (!anchorId) {
        return null
      }
      const id = window.CSS?.escape ? window.CSS.escape(anchorId) : anchorId
      return document.querySelector(`span[data-comment-id="${id}"]`)
    },
    /**
     * Lay anchored comment cards out in the margin, vertically aligned with the
     * text they're anchored to (like Google Docs). Cards that would overlap are
     * pushed down; the active thread is pinned to its anchor and its neighbours
     * reflow around it. Threads whose anchor can't be found (and non-anchored
     * comments) fall back to the general section.
     */
    computeLayout() {
      if (!this.marginMode) {
        this.computeDrawerOrder()
        return
      }
      const marginEl = this.$refs.margin
      if (!marginEl) {
        return
      }
      this.observeLayoutSources(marginEl)

      const marginTop = marginEl.getBoundingClientRect().top
      const activeId = this.controller.activeCommentId

      const candidates = []
      if (this.controller.draft) {
        candidates.push({
          key: 'draft',
          draft: true,
          anchorId: this.controller.draft.anchorId,
        })
      }
      for (const thread of this.openThreads) {
        if (thread.anchorId) {
          candidates.push({
            key: thread.root._meta.self,
            anchorId: thread.anchorId,
          })
        }
      }

      const cards = []
      const unanchored = []
      for (const candidate of candidates) {
        const span = this.anchorElement(candidate.anchorId)
        if (!span) {
          if (!candidate.draft) {
            unanchored.push(candidate.key)
          }
          continue
        }
        const anchorTop = Math.max(0, span.getBoundingClientRect().top - marginTop)
        const height = this.cardEls[candidate.key]?.offsetHeight ?? 120
        cards.push({ ...candidate, anchorTop, height })
      }
      for (const thread of this.openThreads) {
        if (!thread.anchorId) {
          unanchored.push(thread.root._meta.self)
        }
      }

      cards.sort((a, b) => a.anchorTop - b.anchorTop)
      this.resolveCollisions(cards, activeId)

      // The margin only needs to be as tall as its lowest card. Reserving the full
      // content height here was what pushed the general section (composer, resolved
      // panel) far below the fold; the row's align-start keeps the content column
      // at its natural height regardless of how short the comments column is.
      const lastBottom = cards.reduce((max, c) => Math.max(max, c.top + c.height), 0)

      // Only thread KEYS go into the layout; the template resolves them against
      // threadsByKey at render time. Capturing thread objects here froze cards on
      // a stale snapshot: replies and edits change neither keys nor positions, so
      // the signature guard below (intentionally) skips the reassignment.
      const layout = {
        cards: cards.map((c) => ({
          key: c.key,
          draft: c.draft,
          top: Math.round(c.top),
          active: this.isActive(c, activeId),
        })),
        unanchored,
        height: `${lastBottom}px`,
      }

      // Only reassign when something actually changed. computeLayout runs on every
      // re-render (via updated()), so without this guard a fresh object reference
      // each time would loop re-render -> updated -> computeLayout indefinitely.
      const signature = JSON.stringify({
        c: layout.cards.map((c) => [c.key, c.top, c.active]),
        u: layout.unanchored,
        h: layout.height,
      })
      if (signature !== this.layoutSignature) {
        this.layoutSignature = signature
        this.layout = layout
      }
    },
    // Document-order positions for the drawer list. Viewport-relative tops are
    // fine for sorting: scrolling shifts all anchors equally.
    computeDrawerOrder() {
      const order = {}
      for (const thread of this.openThreads) {
        const el = this.anchorElement(thread.anchorId)
        if (el) {
          order[thread.root._meta.self] = el.getBoundingClientRect().top
        }
      }
      const signature = JSON.stringify(order)
      if (signature !== this.drawerOrderSignature) {
        this.drawerOrderSignature = signature
        this.drawerOrder = order
      }
    },
    // Greedy top-down placement; if a thread is active, pin it to its anchor and
    // reflow neighbours above and below so it lands exactly next to its text.
    resolveCollisions(cards, activeId) {
      let prevBottom = -Infinity
      for (const card of cards) {
        card.top = Math.max(card.anchorTop, prevBottom + CARD_GAP)
        prevBottom = card.top + card.height
      }

      const activeIndex = cards.findIndex((c) => this.isActive(c, activeId))
      if (activeIndex < 0) {
        return
      }
      cards[activeIndex].top = cards[activeIndex].anchorTop
      for (let i = activeIndex + 1; i < cards.length; i++) {
        cards[i].top = Math.max(
          cards[i].anchorTop,
          cards[i - 1].top + cards[i - 1].height + CARD_GAP
        )
      }
      for (let i = activeIndex - 1; i >= 0; i--) {
        const ceiling = cards[i + 1].top - CARD_GAP - cards[i].height
        cards[i].top = Math.max(0, Math.min(cards[i].anchorTop, ceiling))
      }
    },
    isActive(card, activeId) {
      if (!activeId) {
        return false
      }
      // activeId is either an anchorId (focused via the highlight) or the thread
      // root's IRI, which doubles as the card key (focused via the card).
      return card.anchorId === activeId || card.key === activeId
    },
    observeLayoutSources(marginEl) {
      if (!this.resizeObserver) {
        return
      }
      this.resizeObserver.disconnect()
      this.resizeObserver.observe(marginEl)
      const contentEl = marginEl
        .closest('.ec-comment-row')
        ?.querySelector('.ec-comment-content')
      if (contentEl) {
        this.resizeObserver.observe(contentEl)
      }
    },
    async addComment() {
      this.saving = true
      try {
        await this.api.post(await this.api.href(this.api.get(), 'comments'), {
          textHtml: this.newComment,
          activity: this.activity._meta.self,
          camp: this.activity.camp()._meta.self,
        })
        await this.comments.$reload()
        this.newComment = ''
        this.composerKey++
      } finally {
        this.saving = false
      }
    },
  },
}
</script>

<style scoped>
.ec-comment-margin {
  position: relative;
  width: 100%;
}
.ec-comment-card {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  transition: transform 0.18s ease;
}
.ec-comment-card--active {
  z-index: 2;
}
.ec-comment-new {
  background-color: #fff;
}
.e-story-day :deep(.v-text-field) {
  margin-top: 0;
  padding-top: 0;
}
/* this disables the bottom border which is displayed for VTextField in "regular" style */
.e-story-day--textmode :deep(.v-input__slot)::before {
  display: none;
}
</style>
