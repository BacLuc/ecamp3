<template>
  <content-node-content :content-node="contentNode" :icon-path="mdiScriptTextOutline">
    <table class="tw-w-full">
      <thead class="tw-break-after-avoid">
        <tr>
          <th v-if="timeColumn" class="column column1 header tw-w-1/12 tw-text-left">
            {{ $t('contentNode.storyboard.entity.section.fields.column1') }}
          </th>
          <th
            class="column column2 header tw-w-10/12"
            :class="{ 'tw-border-l-0 tw-pl-0': !timeColumn }"
          >
            {{ $t('contentNode.storyboard.entity.section.fields.column2Html') }}
          </th>
          <th v-if="responsibleColumn" class="column column3 header tw-w-1/12">
            {{ $t('contentNode.storyboard.entity.section.fields.column3') }}
          </th>
          <th v-if="materialsColumn" class="column column4 header tw-w-1/12">
            {{ $t('contentNode.storyboard.entity.section.fields.column4') }}
          </th>
        </tr>
      </thead>
      <tbody class="tw-break-anywhere">
        <tr v-for="(section, key) in sections" :key="key">
          <td v-if="timeColumn" class="column column1 tw-tabular-nums tw-text-right">
            {{ section.column1 }}
          </td>
          <td class="column column2" :class="{ 'tw-border-l-0 tw-pl-0': !timeColumn }">
            <rich-text :rich-text="section.column2Html" />
          </td>
          <td v-if="responsibleColumn" class="column column3">
            {{ section.column3 }}
          </td>
          <td v-if="materialsColumn" class="column column4">
            {{ section.column4 }}
          </td>
        </tr>
      </tbody>
    </table>
  </content-node-content>
</template>

<script>
import RichText from '../../generic/RichText.vue'
import ContentNodeContent from './ContentNodeContent.vue'
import values from 'lodash-es/values.js'
import { mdiScriptTextOutline } from '@mdi/js'

export default {
  components: {
    RichText,
    ContentNodeContent,
  },
  props: {
    contentNode: { type: Object, required: true },
  },
  data() {
    return {
      mdiScriptTextOutline,
    }
  },
  computed: {
    sections() {
      const sections = values(this.contentNode.data.sections)
      return [...sections].sort(
        (section1, section2) => section1.position - section2.position
      )
    },
    timeColumn() {
      return this.contentNode.data.timeColumn ?? true
    },
    responsibleColumn() {
      return this.contentNode.data.responsibleColumn ?? true
    },
    materialsColumn() {
      return this.contentNode.data.materialsColumn ?? false
    },
  },
}
</script>

<style scoped lang="scss">
.header {
  padding-bottom: 0;
  border-bottom: 1px solid rgb(148 163 184);
  font-weight: 600;
}

.column {
  padding-top: 2px;
  padding-bottom: 8px;
  vertical-align: top;
}

.column1 {
  text-align: left;
  padding-right: 4px;
}

.column2 {
  text-align: left;
  border-left: 0.5px solid rgb(148 163 184);
  padding-left: 4px;
  padding-right: 4px;
}

.column3 {
  border-left: 1px solid rgb(148 163 184);
  padding-left: 4px;
}

.column4 {
  border-left: 1px solid rgb(148 163 184);
  padding-left: 4px;
}
</style>
