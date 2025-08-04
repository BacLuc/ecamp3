<template>
  <v-btn color="secondary" v-bind="$attrs" variant="text" v-on="$listeners">
    {{ $tc('global.button.cancel') }}
  </v-btn>
</template>

<script>
export default {
  name: 'ButtonCancel',
}
</script>
