<template>
  <e-form name="activity">
    <div class="e-form-container d-flex gap-2">
      <e-text-field
        v-model="activity.title"
        path="title"
        vee-rules="required"
        class="flex-grow-1"
        autofocus
        @focus="autoselectTitle ? $event.target.select() : null"
      />
      <slot name="textFieldTitleAppend" />
    </div>

    <e-select
      v-if="Object.values(categories).length > 0"
      v-model="activity.category"
      path="category"
      :items="Object.keys(categories)"
      vee-rules="required"
    >
      <template #item="{ item, props }">
        <v-list-item :key="item" v-bind="props">
          <template #title>
            <category-chip :category="categories[item.value]" dense class="mr-1" />{{
              categories[item.value].name
            }}
          </template>
        </v-list-item>
      </template>
      <template #selection="{ item }">
        <div class="v-select__selection">
          <category-chip :category="categories[item.value]" dense class="mr-1" />{{
            categories[item.value].name
          }}
        </div>
      </template>
    </e-select>

    <e-text-field v-if="!hideLocation" v-model="activity.location" path="location" />

    <FormScheduleEntryList
      v-if="activity.scheduleEntries && !scheduleEntriesReadonly"
      :schedule-entries="activity.scheduleEntries"
      :current-schedule-entry="currentScheduleEntry"
      :period="period"
      :periods="camp.periods().items"
    />
  </e-form>
</template>

<script>
import CategoryChip from '@/components/generic/CategoryChip.vue'
import FormScheduleEntryList from './FormScheduleEntryList.vue'
import EForm from '@/components/form/base/EForm.vue'
import { keyBy } from 'lodash-es'

export default {
  name: 'DialogActivityForm',
  components: {
    EForm,
    CategoryChip,
    FormScheduleEntryList,
  },
  props: {
    activity: {
      type: Object,
      required: true,
    },
    // currently visible period
    period: {
      type: Object,
      required: true,
    },
    currentScheduleEntry: {
      type: Object,
      default: null,
    },
    autoselectTitle: {
      type: Boolean,
      default: false,
    },
    hideLocation: {
      type: Boolean,
      default: false,
    },
    // when true, the schedule entries ("Geplante Termine") section is hidden, because the
    // current user is not allowed to change the timing of the activity
    scheduleEntriesReadonly: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    categories() {
      const categories = this.camp.categories().items
      return keyBy(categories, '_meta.self')
    },
    camp() {
      return this.period.camp()
    },
  },
}
</script>
