<template>
  <v-container fluid>
    <content-card :title="$tc('views.camps.title')" max-width="800" toolbar>
      <template #title-actions>
        <UserMeta v-if="!$vuetify.breakpoint.mdAndUp" avatar-only btn-classes="mr-n4" />
      </template>
      <v-list class="py-0">
        <template v-if="loading">
          <v-skeleton-loader type="list-item-two-line" height="64" />
          <v-skeleton-loader type="list-item-two-line" height="64" />
        </template>
        <template v-else>
          <CampListItem
            v-for="{ camp, periods } in upcomingCamps"
            :key="camp._meta.self"
            :camp="camp"
            :periods="periods"
          />
        </template>
        <v-list-item>
          <v-list-item-content />
          <v-list-item-action>
            <button-add
              data-testid="create-camp-button"
              icon="mdi-plus"
              :to="{ name: 'camps/create' }"
            >
              {{ $tc('views.camps.create') }}
            </button-add>
          </v-list-item-action>
        </v-list-item>
      </v-list>
      <v-expansion-panels
        v-if="
          !loading && ((isAdmin && prototypeCamps.length > 0) || pastCamps.length > 0)
        "
        multiple
        flat
        accordion
      >
        <v-expansion-panel v-if="isAdmin && prototypeCamps.length > 0">
          <v-expansion-panel-header>
            <h3>
              {{ $tc('views.camps.prototypeCamps') }}
            </h3>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-list class="py-0">
              <CampListItem
                v-for="camp in prototypeCamps"
                :key="camp._meta.self"
                :camp="camp"
              />
            </v-list>
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel v-if="!loading && pastCamps.length > 0">
          <v-expansion-panel-header>
            <h3>
              {{ $tc('views.camps.pastCamps') }}
            </h3>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-list class="py-0">
              <CampListItem
                v-for="{ camp, periods } in pastCamps"
                :key="camp._meta.self"
                :camp="camp"
                :periods="periods"
              />
            </v-list>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </content-card>
  </v-container>
</template>

<script>
import dayjs from '@/common/helpers/dayjs.js'
import { campRoute } from '@/router.js'
import { isAdmin } from '@/plugins/auth'
import ContentCard from '@/components/layout/ContentCard.vue'
import ButtonAdd from '@/components/buttons/ButtonAdd.vue'
import { mapGetters } from 'vuex'
import UserMeta from '@/components/navigation/UserMeta.vue'
import CampListItem from '@/components/camp/CampListItem.vue'
import groupBy from 'lodash-es/groupBy.js'

export default {
  name: 'Camps',
  components: {
    CampListItem,
    UserMeta,
    ContentCard,
    ButtonAdd,
  },
  data: function () {
    return {
      loading: true,
      isAdmin: false,
    }
  },
  head() {
    return {
      title: this.$tc('views.camps.title'),
    }
  },
  computed: {
    camps() {
      return this.api.get().camps()
    },
    periods() {
      return this.api.get().periods()
    },
    prototypeCamps() {
      return this.camps.items.filter((c) => c.isPrototype)
    },
    upcomingCamps() {
      return Object.values(
        groupBy(
          this.periods.items.filter((p) => dayjs(p.end).endOf('day').isAfter(dayjs())),
          (p) => p.camp()._meta.self
        )
      )
        .map((periods) => ({
          camp: periods[0].camp(),
          periods: periods,
        }))
        .filter(({ camp }) => !camp.isPrototype)
    },
    pastCamps() {
      return Object.values(
        groupBy(
          this.periods.items.filter((p) => !dayjs(p.end).endOf('day').isAfter(dayjs())),
          (p) => p.camp()._meta.self
        )
      )
        .map((periods) => ({
          camp: periods[0].camp(),
          periods: periods,
        }))
        .filter(({ camp }) => !camp.isPrototype)
    },
    ...mapGetters({
      user: 'getLoggedInUser',
    }),
  },
  async mounted() {
    this.loadCamps()
    this.isAdmin = isAdmin()
  },
  methods: {
    campRoute,
    async loadCamps() {
      // Only reload camps if they were loaded before, to avoid console error
      if (this.camps._meta.self !== null) {
        this.api.reload(this.camps)
      }

      await Promise.all([this.camps._meta.load, this.periods._meta.load])

      this.loading = false
    },
  },
}
</script>

<style scoped>
.v-expansion-panel-content:deep(.v-expansion-panel-content__wrap) {
  padding: 0 !important;
}
</style>
