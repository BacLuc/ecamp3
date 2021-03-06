<!--
Show all activity schedule entries of a single period.
-->

<template>
  <content-card>
    <v-sheet>
      <search-mobile v-if="$vuetify.breakpoint.xs" />
      <v-btn
        :fixed="$vuetify.breakpoint.xs"
        :absolute="!$vuetify.breakpoint.xs"
        light class="fab--top_nav"
        fab small
        style="z-index: 3"
        top right
        :class="{'float-right':!$vuetify.breakpoint.xs}"
        color="white"
        :to="{ query: { ...$route.query, list: !listFormat || undefined } }">
        <v-icon v-if="listFormat">mdi-calendar-month</v-icon>
        <v-icon v-else>mdi-menu</v-icon>
      </v-btn>
      <template v-if="!firstPeriodLoaded">
        <v-skeleton-loader v-if="listFormat" type="list-item-avatar-two-line@2" class="py-2" />
        <v-skeleton-loader v-else type="table" />
      </template>
      <template v-if="firstPeriod">
        <activity-list
          v-if="listFormat"
          :camp="camp" :schedule-entries="firstPeriod.scheduleEntries().items" />
        <picasso
          v-else
          :camp="camp"
          class="mx-2 ma-sm-0 pa-sm-2"
          :schedule-entries="firstPeriod.scheduleEntries().items"
          :start="new Date(Date.parse(firstPeriod.start))"
          :end="new Date(Date.parse(firstPeriod.end))" />
      </template>
      <v-btn
        :fixed="$vuetify.breakpoint.xs"
        :absolute="!$vuetify.breakpoint.xs"
        dark
        fab
        style="z-index: 3"
        bottom
        right
        class="fab--bottom_nav float-right"
        color="red">
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </v-sheet>
  </content-card>
</template>
<script>
import ContentCard from '@/components/layout/ContentCard'
import SearchMobile from '@/components/navigation/SearchMobile'
import Picasso from '@/components/camp/Picasso'
import ActivityList from '@/components/camp/ActivityList'

export default {
  name: 'CampProgram',
  components: {
    ContentCard,
    SearchMobile,
    Picasso,
    ActivityList
  },
  props: {
    camp: { type: Function, required: true }
  },
  data () {
    return {
      tab: null
    }
  },
  computed: {
    listFormat () {
      return this.$route.query.list
    },
    periods () {
      return this.camp().periods()
    },
    firstPeriod () {
      return this.periods.items[0]
    },
    firstPeriodLoaded () {
      return this.firstPeriod && !this.firstPeriod._meta.loading
    }
  },
  mounted () {
    this.camp().activities()
  }
}
</script>

<style lang="scss">
  .fab--bottom_nav {
    position: fixed;
    bottom: 16px + 56px !important;
    @media #{map-get($display-breakpoints, 'sm-and-up')}{
      bottom: 16px + 36px !important;
    }
  }

  .fab--top_nav {
    position: fixed;
    top: 16px + 105px !important;
    @media #{map-get($display-breakpoints, 'sm-and-up')}{
      top: 16px + 65px !important;
    }
  }
</style>

<style lang="scss" scoped>
  ::v-deep .v-skeleton-loader__list-item-avatar-two-line {
    height: 60px;
  }
</style>
