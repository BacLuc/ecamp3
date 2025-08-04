<template>
  <div class="px-md-4 flex-grow-1 d-flex flex-column justify-content-between">
    <e-select
      v-model="options.periods"
      :label="$tc('print.config.periods')"
      :items="periods"
      multiple
      :filled="false"
      :readonly="periods.length === 1"
      @input="$emit('input')"
    />
    <e-select
      v-model="options.orientation"
      :label="$tc('components.print.config.picassoConfig.orientation')"
      :items="orientations"
      :filled="false"
      @input="$emit('input')"
    />
    <div class="flex-grow-1"></div>
    <DialogScheduleEntryFilter
      :camp="camp"
      :filter-fn="filterFn()"
      :filter="options.filter"
      hide-period-filter
      @input="updateFilter"
    />
  </div>
</template>

<script>
import cloneDeep from 'lodash-es/cloneDeep'
import DialogScheduleEntryFilter from './DialogScheduleEntryFilter.vue'
import { filterMatchScheduleEntry } from '@/common/helpers/filterMatchScheduleEntry.js'
import { repairPrintFilterConfig } from '../repairPrintConfig.js'

const ORIENTATIONS = [
  {
    value: 'L',
    text: 'Landscape',
  },
  {
    value: 'P',
    text: 'Portrait',
  },
]

export default {
  name: 'PicassoConfig',
  components: { DialogScheduleEntryFilter },
  props: {
    value: { type: Object, required: true },
    camp: { type: Object, required: true },
  },
  data() {
    return {
      orientations: cloneDeep(ORIENTATIONS),
    }
  },
  computed: {
    options: {
      get() {
        return this.value
      },
      set(v) {
        this.$emit('input', v)
      },
    },
    periods() {
      return this.camp.periods().items.map((p) => ({
        value: p._meta.self,
        text: p.description,
      }))
    },
    selectedPeriods() {
      if (!this.options.filter.period) return this.camp.periods().items
      return this.camp.periods().items.filter((period) => {
        return this.filter.periods.includes(period._meta.self)
      })
    },
  },
  methods: {
    filterFn() {
      return (filter) =>
        this.selectedPeriods
          .flatMap((period) => period.scheduleEntries().items)
          .filter((scheduleEntry) => filterMatchScheduleEntry(scheduleEntry, filter))
    },
    updateFilter(newFilter) {
      this.options.filter = newFilter
      this.$emit('input')
    },
  },
  defaultOptions(camp) {
    return {
      periods:
        camp.periods().items.length === 1 ? [camp.periods().items[0]._meta.self] : [],
      orientation: 'L',
    }
  },
  design: {
    multiple: false,
  },
  repairConfig(config, camp) {
    if (!config.options) config.options = {}
    const knownPeriods = camp.periods().items.map((p) => p._meta.self)
    if (knownPeriods.length === 1) {
      config.options.periods = [camp.periods().items[0]._meta.self]
    } else {
      if (!config.options.periods) config.options.periods = []
      config.options.periods = config.options.periods.filter((period) => {
        return knownPeriods.includes(period)
      })
    }
    if (!ORIENTATIONS.map((o) => o.value).includes(config.options.orientation)) {
      config.options.orientation = 'L'
    }
    return repairPrintFilterConfig(config, camp, knownPeriods)
  },
}
</script>
