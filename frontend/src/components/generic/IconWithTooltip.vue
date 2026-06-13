<template>
  <v-tooltip
    v-if="showIcon"
    color="#333"
    location="bottom"
    max-width="300px"
    :open-on-click="$vuetify.display.smAndDown"
    :open-on-hover="$vuetify.display.mdAndUp"
  >
    <template #activator="{ props }">
      <v-btn :icon="icon" class="tooltip-activator" v-bind="props" />
    </template>
    <slot>
      {{ text }}
      <i18n-t v-if="tooltipI18nKey" :keypath="tooltipI18nKey" scope="global">
        <template #br><br class="linebreak" /></template>
      </i18n-t>
    </slot>
  </v-tooltip>
</template>

<script>
export default {
  name: 'IconWithTooltip',
  components: {},
  inheritAttrs: false,
  props: {
    icon: { type: String, required: false, default: 'mdi-information-outline' },
    text: { type: String, required: false, default: undefined },
    tooltipI18nKey: { type: String, required: false, default: undefined },
  },
  computed: {
    showIcon() {
      return (
        this.text ||
        'default' in this.$slots ||
        this.$t(this.tooltipI18nKey) != this.tooltipI18nKey
      )
    },
  },
}
</script>

<style scoped>
br.linebreak {
  display: block;
  content: '';
  margin-top: 8px;
}
</style>
