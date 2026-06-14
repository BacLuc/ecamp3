<template>
  <ContentNodeCard v-bind="$props">
    <material-table
      :camp="camp"
      :material-node="contentNode"
      :layout-mode="layoutMode"
      :material-item-collection="materialItemCollection"
      :disabled="disabled"
      hide-period-filter
    />
  </ContentNodeCard>
</template>

<script>
import ContentNodeCard from '@/components/activity/content/layout/ContentNodeCard.vue'
import { contentNodeMixin } from '@/mixins/contentNodeMixin.js'
import MaterialTable from '@/components/material/MaterialTable.vue'

export default {
  name: 'Material',
  components: {
    ContentNodeCard,
    MaterialTable,
  },
  mixins: [contentNodeMixin],
  computed: {
    materialItemCollection() {
      return this.contentNode.materialItems()
    },
  },
}
</script>

<style scoped></style>
