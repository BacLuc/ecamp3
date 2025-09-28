<!--
Show all activity schedule entries of a single period.
-->

<template>
  <content-card
    :no-border="$vuetify.display.mdAndUp && openFilter"
    :title="$t('views.camp.campProgram.title')"
    toolbar
  >
    <template #title-actions>
      <period-switcher :period="period" />
      <v-spacer />
      <template v-if="$vuetify.display.smAndUp">
        <v-toolbar-items v-if="isFilterSet">
          <v-chip
            :input-value="openFilter"
            class="align-self-center mr-2"
            color="primary"
            label
            outlined
            @click="openFilter = !openFilter"
          >
            <v-icon left size="20">mdi-filter</v-icon>
            {{ filteredPropertiesCount }}
          </v-chip>
        </v-toolbar-items>
        <v-chip
          v-else
          :input-value="openFilter"
          class="mr-1"
          label
          outlined
          @click="openFilter = !openFilter"
        >
          <v-icon color="rgba(0, 0, 0, 0.54)" size="20">mdi-filter</v-icon>
        </v-chip>
      </template>
      <LockButton
        v-model="editMode"
        :disabled-for-guest="!isContributor"
        :shake="showReminder"
        @click="editMode = !editMode"
      />
      <v-menu offset-y>
        <template #activator="{ on, attrs }">
          <v-btn icon v-bind="attrs" v-on="on">
            <v-badge
              v-if="!$vuetify.display.smAndUp && filteredPropertiesCount > 0"
              dot
              offset-x="2"
              overlap
            >
              <v-icon>mdi-dots-horizontal</v-icon>
            </v-badge>
            <v-icon v-else>mdi-dots-horizontal</v-icon>
          </v-btn>
        </template>
        <v-list class="py-0">
          <LockUnlockListItem
            v-model="editMode"
            :disabled="!isContributor"
            @click="editMode = !editMode"
          />
          <v-list-item
            :color="isFilterSet ? 'primary' : null"
            :input-value="isFilterSet"
            @click="openFilter = !openFilter"
          >
            <v-list-item-icon>
              <v-icon>mdi-filter</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>Filter</v-list-item-title>
            </v-list-item-content>
            <v-list-item-action v-if="isFilterSet">
              <v-badge :content="filteredPropertiesCount" color="primary" inline />
            </v-list-item-action>
          </v-list-item>
          <v-divider />
          <DownloadNuxtPdf :config="printConfig" />
          <DownloadClientPdf :config="printConfig" />
        </v-list>
      </v-menu>
    </template>

    <ScheduleEntryFilters
      v-if="$vuetify.display.mdAndUp && openFilter"
      v-model="filter"
      :camp="camp"
      :loading-endpoints="loadingEndpoints"
      class="ec-content-card__toolbar--border pb-4 justify-center"
      @height-changed="scheduleEntryFiltersHeightChanged"
    />
    <template v-if="loading">
      <v-skeleton-loader type="table" />
    </template>
    <v-calendar
      ref="calendar"
      v-model="value"
      :event-color="getEventColor"
      :event-ripple="false"
      :events="events"
      color="primary"
      type="4day"
      @change="getEvents"
      @mouseleave="cancelDrag"
      @mousedown:event="startDrag"
      @mousedown:time="startTime"
      @mousemove:time="mouseMove"
      @mouseup:time="endDrag"
    >
      <template v-slot:event="{ event, timed, eventSummary }">
        <div class="v-event-draggable">
          <component :is="eventSummary"></component>
        </div>
        <div
          v-if="timed"
          class="v-event-drag-bottom"
          @mousedown.stop="extendBottom(event)"
        ></div>
      </template>
    </v-calendar>
    <v-snackbar v-model="showReminder" class="mb-12" light>
      <v-icon>mdi-lock</v-icon>
      {{ reminderText }}
    </v-snackbar>
    <v-bottom-sheet v-if="!$vuetify.display.mdAndUp" v-model="openFilter">
      <v-sheet class="text-center" height="200px">
        <ScheduleEntryFilters
          v-model="filter"
          :camp="camp"
          :loading-endpoints="loadingEndpoints"
          class="pa-4"
        />
      </v-sheet>
    </v-bottom-sheet>
  </content-card>
</template>

<script setup>
import { ref } from 'vue'

const value = ref('')
const events = ref([])
const colors = [
  '#2196F3',
  '#3F51B5',
  '#673AB7',
  '#00BCD4',
  '#4CAF50',
  '#FF9800',
  '#757575',
]
const names = [
  'Meeting',
  'Holiday',
  'PTO',
  'Travel',
  'Event',
  'Birthday',
  'Conference',
  'Party',
]
const dragEvent = ref(null)
const dragTime = ref(null)
const createEvent = ref(null)
const createStart = ref(null)
const extendOriginal = ref(null)

function startDrag(nativeEvent, { event, timed }) {
  if (event && timed) {
    dragEvent.value = event
    dragTime.value = null
    extendOriginal.value = null
  }
}

function startTime(nativeEvent, tms) {
  const mouse = toTime(tms)

  if (dragEvent.value && dragTime.value === null) {
    const start = dragEvent.value.start
    dragTime.value = mouse - start
  } else {
    createStart.value = roundTime(mouse)
    createEvent.value = {
      name: `Event #${events.value.length}`,
      color: rndElement(colors),
      start: createStart.value,
      end: createStart.value,
      timed: true,
    }
    events.value.push(createEvent.value)
  }
}

function extendBottom(event) {
  createEvent.value = event
  createStart.value = event.start
  extendOriginal.value = event.end
}

function mouseMove(nativeEvent, tms) {
  const mouse = toTime(tms)

  if (dragEvent.value && dragTime.value !== null) {
    const start = dragEvent.value.start
    const end = dragEvent.value.end
    const duration = end - start
    const newStartTime = mouse - dragTime.value
    const newStart = roundTime(newStartTime)
    const newEnd = newStart + duration

    dragEvent.value.start = newStart
    dragEvent.value.end = newEnd
  } else if (createEvent.value && createStart.value !== null) {
    const mouseRounded = roundTime(mouse, false)
    const min = Math.min(mouseRounded, createStart.value)
    const max = Math.max(mouseRounded, createStart.value)

    createEvent.value.start = min
    createEvent.value.end = max
  }
}

function endDrag() {
  dragTime.value = null
  dragEvent.value = null
  createEvent.value = null
  createStart.value = null
  extendOriginal.value = null
}

function cancelDrag() {
  if (createEvent.value) {
    if (extendOriginal.value) {
      createEvent.value.end = extendOriginal.value
    } else {
      const i = events.value.indexOf(createEvent.value)
      if (i !== -1) {
        events.value.splice(i, 1)
      }
    }
  }

  createEvent.value = null
  createStart.value = null
  dragTime.value = null
  dragEvent.value = null
}

function roundTime(time, down = true) {
  const roundTo = 15 // minutes
  const roundDownTime = roundTo * 60 * 1000

  return down
    ? time - (time % roundDownTime)
    : time + (roundDownTime - (time % roundDownTime))
}

function toTime(tms) {
  return new Date(tms.year, tms.month - 1, tms.day, tms.hour, tms.minute).getTime()
}

function getEventColor(event) {
  const rgb = parseInt(event.color.substring(1), 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff

  return event === dragEvent.value
    ? `rgba(${r}, ${g}, ${b}, 0.7)`
    : event === createEvent.value
      ? `rgba(${r}, ${g}, ${b}, 0.7)`
      : event.color
}

function getEvents({ start, end }) {
  const newEvents = []

  const min = new Date(`${start.date}T00:00:00`).getTime()
  const max = new Date(`${end.date}T23:59:59`).getTime()
  const days = (max - min) / 86400000
  const eventCount = rnd(days, days + 20)

  for (let i = 0; i < eventCount; i++) {
    const timed = rnd(0, 3) !== 0
    const firstTimestamp = rnd(min, max)
    const secondTimestamp = rnd(2, timed ? 8 : 288) * 900000
    const startTime = firstTimestamp - (firstTimestamp % 900000)
    const endTime = startTime + secondTimestamp

    newEvents.push({
      name: rndElement(names),
      color: rndElement(colors),
      start: startTime,
      end: endTime,
      timed,
    })
  }

  events.value = newEvents
}

function rnd(a, b) {
  return Math.floor((b - a + 1) * Math.random()) + a
}

function rndElement(arr) {
  return arr[rnd(0, arr.length - 1)]
}
</script>

<script>
import { campRoleMixin } from '@/mixins/campRoleMixin'
import ContentCard from '@/components/layout/ContentCard.vue'
import Picasso from '@/components/program/picasso/Picasso.vue'
import ScheduleEntries from '@/components/program/ScheduleEntries.vue'
import PeriodSwitcher from '@/components/program/PeriodSwitcher.vue'
import DownloadNuxtPdf from '@/components/print/print-nuxt/DownloadNuxtPdfListItem.vue'
import DownloadClientPdf from '@/components/print/print-client/DownloadClientPdfListItem.vue'
import LockButton from '@/components/generic/LockButton.vue'
import LockUnlockListItem from '@/components/generic/LockUnlockListItem.vue'
import ScheduleEntryFilters from '@/components/program/ScheduleEntryFilters.vue'
import {
  filterAndQueryAreEqual,
  processRouteQuery,
  transformValuesToHalId,
} from '@/helpers/querySyncHelper.js'

export default {
  name: 'CampProgram',
  components: {
    ScheduleEntryFilters,
    DownloadNuxtPdf,
    DownloadClientPdf,
    PeriodSwitcher,
    ContentCard,
    Picasso,
    ScheduleEntries,
    LockButton,
    LockUnlockListItem,
  },
  mixins: [campRoleMixin],
  props: {
    period: { type: Object, required: true },
  },
  data() {
    return {
      showReminder: false,
      reminderText: null,
      openFilter: false,
      loading: true,
      loadingEndpoints: {
        categories: true,
        periods: true,
        campCollaborations: true,
        progressLabels: true,
      },
      filter: {
        category: [],
        responsible: [],
        progressLabel: [],
      },
    }
  },
  computed: {
    camp() {
      return this.period.camp()
    },
    printConfig() {
      return {
        camp: this.camp._meta.self,
        language: this.$store.state.lang.language,
        documentName: this.camp.title + '-picasso.pdf',
        contents: [
          {
            type: 'Picasso',
            options: {
              periods: [this.period._meta.self],
              orientation: 'L',
            },
          },
        ],
      }
    },
    editMode: {
      get() {
        return this.$store.getters.getPicassoEditMode(this.camp._meta.self)
      },
      set(value) {
        this.$store.commit('setPicassoEditMode', {
          campUri: this.camp._meta.self,
          editMode: value,
        })
      },
    },
    filteredPropertiesCount() {
      return Object.values(this.filter).filter((item) =>
        Array.isArray(item) ? item.length : !!item
      ).length
    },
    isFilterSet() {
      return this.filteredPropertiesCount > 0
    },
  },
  watch: {
    openFilter: {
      immediate: true,
      handler: 'openFilterChanged',
    },
    'filter.category': 'persistRouterState',
    'filter.responsible': 'persistRouterState',
    'filter.progressLabel': 'persistRouterState',
  },
  async mounted() {
    await Promise.all([
      this.camp._meta.load,
      this.period.scheduleEntries()._meta.load,
      this.camp.activities()._meta.load,
      this.camp.categories()._meta.load,
      this.period.days()._meta.load,
      this.period.dayResponsibles()._meta.load,
    ])

    this.loading = false

    const queryFilters = processRouteQuery(this.$route.query)
    Object.entries(queryFilters).forEach(([key, value]) => {
      this.filter[key] = value
    })
  },
  methods: {
    showUnlockReminder(move) {
      this.reminderText = move
        ? this.$t('views.camp.campProgram.reminderLockedMove')
        : this.$t('views.camp.campProgram.reminderLockedCreate')
      this.showReminder = true
    },
    match(scheduleEntry) {
      return (
        this.filteredPropertiesCount === 0 ||
        ((this.filter.category === null ||
          this.filter.category.length === 0 ||
          this.filter.category.includes(
            scheduleEntry.activity().category()._meta.self
          )) &&
          (this.filter.responsible === null ||
            this.filter.responsible.length === 0 ||
            this.filter.responsible?.every((responsible) =>
              scheduleEntry
                .activity()
                .activityResponsibles()
                .items.map((responsible) => responsible.campCollaboration()._meta.self)
                .includes(responsible)
            ) ||
            (this.filter.responsible[0] === 'none' &&
              scheduleEntry.activity().activityResponsibles().items.length === 0)) &&
          (this.filter.progressLabel === null ||
            this.filter.progressLabel.length === 0 ||
            this.filter.progressLabel?.includes(
              scheduleEntry.activity().progressLabel?.()._meta.self ?? 'none'
            )))
      )
    },
    persistRouterState() {
      const query = transformValuesToHalId(this.filter)
      if (filterAndQueryAreEqual(query, this.$route.query)) return
      this.$router.replace({ query }).catch((err) => console.warn(err))
    },
    openFilterChanged(openFilter) {
      if (!openFilter) {
        this.scheduleEntryFiltersHeightChanged(0)
      }
    },
    scheduleEntryFiltersHeightChanged(h) {
      const root = document.querySelector(':root')
      root.style.setProperty('--schedule-entry-filters-height', `${h}px`)
    },
  },
}
</script>

<style scoped>
:root {
  --schedule-entry-filters-height: 0px;
}
</style>
