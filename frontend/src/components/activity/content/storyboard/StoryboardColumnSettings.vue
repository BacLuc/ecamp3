<template>
  <v-menu :close-on-content-click="false" location="bottom end">
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        size="small"
        density="comfortable"
        variant="text"
        :loading="loading"
        :aria-label="$t('components.activity.content.storyboard.columnSettings.title')"
        :title="$t('components.activity.content.storyboard.columnSettings.title')"
      >
        <v-icon>mdi-view-column-outline</v-icon>
      </v-btn>
    </template>
    <v-list density="compact" min-width="220">
      <v-list-subheader>
        {{ $t('components.activity.content.storyboard.columnSettings.title') }}
      </v-list-subheader>
      <v-list-item>
        <v-checkbox
          :model-value="true"
          :label="$t('contentNode.storyboard.entity.section.fields.column2Html')"
          color="primary"
          density="compact"
          hide-details
          disabled
        />
      </v-list-item>
      <v-list-item>
        <v-checkbox
          :model-value="showTime"
          :label="$t('contentNode.storyboard.entity.section.fields.column1')"
          color="primary"
          density="compact"
          hide-details
          @update:model-value="$emit('update:showTime', !!$event)"
        />
      </v-list-item>
      <v-list-item>
        <v-checkbox
          :model-value="showResponsible"
          :label="$t('contentNode.storyboard.entity.section.fields.column3')"
          color="primary"
          density="compact"
          hide-details
          @update:model-value="$emit('update:showResponsible', !!$event)"
        />
      </v-list-item>
      <v-list-item>
        <v-checkbox
          :model-value="showMaterials"
          :label="$t('contentNode.storyboard.entity.section.fields.column4')"
          color="primary"
          density="compact"
          hide-details
          @update:model-value="$emit('update:showMaterials', !!$event)"
        />
      </v-list-item>
      <v-divider />
      <v-list-item>
        <v-switch
          :model-value="parseTime"
          :label="$t('components.activity.content.storyboard.columnSettings.parseTime')"
          :disabled="!showTime"
          color="primary"
          density="compact"
          hide-details
          inset
          @update:model-value="$emit('update:parseTime', !!$event)"
        />
      </v-list-item>
    </v-list>
  </v-menu>
</template>
<script>
export default {
  name: 'StoryboardColumnSettings',
  props: {
    showTime: { type: Boolean, required: true },
    showResponsible: { type: Boolean, required: true },
    showMaterials: { type: Boolean, required: true },
    parseTime: { type: Boolean, required: true },
    loading: { type: Boolean, default: false },
  },
  emits: [
    'update:showTime',
    'update:showResponsible',
    'update:showMaterials',
    'update:parseTime',
  ],
}
</script>
