<template>
  <div class="button-wrapper">
    <v-btn color="primary" outlined :disabled="loading" @click="generatePdf">
      <v-icon>mdi-printer</v-icon>
      <div class="mx-1">
        {{ $tc('components.print.printClient.downloadClientPdfButton.label') }}
      </div>
    </v-btn>
    <div class="progress-wrapper">
      <v-progress-circular
        v-if="loading"
        :value="progress"
        size="24"
        rotate="270"
      ></v-progress-circular>
      <span v-if="loading">{{ state }}</span>
    </div>
  </div>
</template>

<script>
import { generatePdfMixin } from './generatePdfMixin.js'

export default {
  name: 'DownloadClientPdfButton',
  mixins: [generatePdfMixin],
}
</script>
<style scoped lang="scss">
@use '@/scss/variables' as *;
@import './node_modules/vuetify/src/styles/styles.sass';

.button-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  @media #{map-get($display-breakpoints, 'lg-and-up')} {
    flex-direction: row;
    align-items: center;
  }
}
.progress-wrapper {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  @media #{map-get($display-breakpoints, 'md-and-down')} {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
