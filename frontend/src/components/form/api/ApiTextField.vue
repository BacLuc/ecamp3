<!--
Displays a field as a e-text-field + write access via API wrapper
-->

<template>
  <api-wrapper v-slot="wrapper" v-bind="{ ...$props, ...$attrs }">
    <e-text-field
      ref="textField"
      :model-value="wrapper.localValue"
      v-bind="$attrs"
      :path="path"
      :readonly="wrapper.readonly"
      :disabled="disabled"
      :error-messages="wrapper.errorMessages"
      :loading="wrapper.isSaving || wrapper.isLoading ? 'secondary' : false"
      :variant
      :density
      @update:model-value="wrapper.on.input"
      @blur="wrapper.on.blur"
    >
      <template #append-inner>
        <api-wrapper-append :wrapper="wrapper" />
      </template>
    </e-text-field>
  </api-wrapper>
</template>

<script>
import { apiPropsMixin } from '@/mixins/apiPropsMixin.js'
import ApiWrapper from './ApiWrapper.vue'
import ApiWrapperAppend from './ApiWrapperAppend.vue'

export default {
  name: 'ApiTextField',
  components: { ApiWrapper, ApiWrapperAppend },
  mixins: [apiPropsMixin],
  props: {
    /* optional transform applied to the value before saving back to the API */
    parse: { type: Function, required: false, default: null },
  },
  data() {
    return {}
  },
  methods: {
    focus() {
      this.$refs.textField.focus()
    },
  },
}
</script>

<style scoped></style>
