<template>
  <Text
    :id="`${id}-${period.id}`"
    :bookmark="{ title: period.description, fit: true }"
    class="program-period-title"
    >{{ $t('print.program.title') }}: {{ period.description }}</Text
  >
  <ScheduleEntry
    v-for="scheduleEntry in scheduleEntries"
    :id="`${id}-${period.id}-${scheduleEntry.id}`"
    :schedule-entry="scheduleEntry"
  />
</template>
<script>
import PdfComponent from '@/PdfComponent.js'
import ScheduleEntry from '../scheduleEntry/ScheduleEntry.vue'
import { filterMatchScheduleEntry } from '@/../common/helpers/filterMatchScheduleEntry.js'

export default {
  name: 'ProgramPeriod',
  components: { ScheduleEntry },
  extends: PdfComponent,
  props: {
    period: { type: Object, required: true },
    filter: { type: Object, default: () => ({}) },
  },
  computed: {
    scheduleEntries() {
      return this.period.scheduleEntries().items.filter((scheduleEntry) => {
        return filterMatchScheduleEntry(scheduleEntry, this.filter)
      })
    },
  },
}
</script>
<pdf-style>
.program-period-title {
  font-size: 10pt;
  font-weight: bold;
  text-align: center;
}
</pdf-style>
