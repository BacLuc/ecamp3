<template>
  <Field
    v-slot="{ errors: veeFieldErrors, value, field }"
    ref="validationField"
    :model-value="modelValue"
    as="div"
    :name="veeId ?? path ?? validationLabel"
    :label="validationLabel"
    :rules="veeRules"
    class="e-form-container"
    @change="$emit('update:model-value', $event)"
  >
    <span>{{ modelValue }}</span>
    <span>{{ console.log(value) }}</span>
    <v-text-field
      ref="textField"
      v-model="field.value"
      v-bind="field"
      :class="[inputClass]"
      :error-messages="(veeFieldErrors ?? []).concat(errorMessages)"
      :label="labelOrEntityFieldLabel"
      :type="type"
      :filled="filled"
      :required="required"
      :hide-details="hideDetails"
    >
      <!-- passing through all slots -->
      <template v-for="(_, slot) of $slots" #[slot]="slotData">
        <slot :name="slot" v-bind="slotData || {}"></slot>
      </template>
    </v-text-field>
  </Field>
</template>

<script>
import { Field } from 'vee-validate'
import { formComponentPropsMixin } from '@/mixins/formComponentPropsMixin.js'
import { formComponentMixin } from '@/mixins/formComponentMixin.js'

export default {
  name: 'ETextField',
  components: { Field },
  mixins: [formComponentPropsMixin, formComponentMixin],
  props: {
    modelValue: { type: String, required: false, default: null },
    type: {
      type: String,
      default: 'text',
    },
  },
  data() {
    return {
      preventValidationOnBlur: false,
    }
  },
  watch: {
    modelValue: {
      handler(newModelValue) {
        console.log('modelValue in eTextField', newModelValue)
      },
    },
  },
  mounted() {
    this.preventValidationOnBlur =
      'autofocus' in this.$attrs &&
      'required' in this.$refs.validationField.$attrs &&
      this.$refs.textField.value == ''
  },
  methods: {
    focus() {
      this.$refs.textField.focus()
    },
    onInput(event, handleChange) {
      this.preventValidationOnBlur = false
      handleChange(event)
      this.$emit('update:model-value', event)
    },
    onBlur(event, handleReset) {
      this.$emit('blur', event)
      if (this.preventValidationOnBlur) {
        handleReset()
      }
      this.preventValidationOnBlur = false
    },
  },
}
</script>

<style scoped>
[required]:deep(label::after) {
  content: '\a0*';
  font-size: 12px;
  color: #d32f2f;
}
[required]:deep(.v-input--is-label-active label::after) {
  color: gray;
}
</style>
