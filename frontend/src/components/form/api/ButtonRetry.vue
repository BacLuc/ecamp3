<template>
  <v-btn
    text
    color="error"
    v-on="$listeners">
    <v-icon>mdi-refresh</v-icon>
    Retry
  </v-btn>
</template>

<script>
export default {
  name: 'ButtonRetry'
}
</script>
