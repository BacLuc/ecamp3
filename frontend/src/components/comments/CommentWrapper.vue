<template>
  <!-- align-start is important: without it the content column stretches to match
       the (taller) comments aside, which we then measure back into the margin
       height, growing the page every frame. -->
  <div class="ec-comment-row d-flex gap-4 align-start">
    <div class="ec-comment-content" style="flex-grow: 1; flex-shrink: 1; min-width: 0">
      <slot />
    </div>
    <template v-if="controller.open">
      <!-- Wide screens: a margin column where anchored comments float next to
           their text (Google-Docs style). Comments.vue positions the cards. -->
      <div v-if="$vuetify.display.width > 1360" class="ec-comment-aside">
        <slot name="comments" />
      </div>
      <!-- Narrow screens: a drawer with a simple stacked list. -->
      <v-navigation-drawer
        v-else
        :model-value="controller.open"
        clipped
        location="right"
        :order="2"
        app
        permanent
        temporary
        color="blue-grey"
        floating
        width="320"
        @update:model-value="controller.open = $event"
      >
        <div class="py-3 px-3 d-flex flex-column gap-2 items-center">
          <slot name="comments" />
        </div>
      </v-navigation-drawer>
    </template>
    <v-fab
      app
      icon
      :order="1"
      location="right bottom"
      color="primary"
      class="mb-4 mr-4 z-10"
      @click="controller.open = !controller.open"
    >
      <v-icon>mdi-chat</v-icon>
    </v-fab>
  </div>
</template>

<script>
export default {
  name: 'CommentWrapper',
  inject: ['commentsController'],
  computed: {
    controller() {
      return this.commentsController
    },
  },
}
</script>

<style scoped>
.ec-comment-aside {
  position: relative;
  flex: 0 0 340px;
  width: 340px;
}

/* eslint-disable-next-line vue-scoped-css/no-unused-selector */
.v-fab :deep(.v-btn--fab) {
  z-index: 10;
}
</style>
