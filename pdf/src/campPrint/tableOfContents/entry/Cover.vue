<template>
  <Link class="toc-entry" :href="`#${id}`">
    <Text>{{ $t('print.cover.title') }}</Text>
  </Link>
</template>
<script>
import PdfComponent from '@/PdfComponent.js'

export default {
  name: 'Cover',
  extends: PdfComponent,
}
</script>
<pdf-style>
</pdf-style>
