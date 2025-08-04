import cloneDeep from 'lodash-es/cloneDeep'
import campShortTitle from '@/common/helpers/campShortTitle.js'
import { isEqual } from 'lodash-es'

export default function repairConfig(
  config,
  camp,
  availableLocales,
  fallbackLocale,
  componentRepairers,
  defaultContents
) {
  const configClone = config ? cloneDeep(config) : {}
  if (!availableLocales.includes(configClone.language)) {
    configClone.language = availableLocales.includes(fallbackLocale)
      ? fallbackLocale
      : availableLocales.length > 0
        ? availableLocales[0]
        : 'en'
  }
  if (!configClone.documentName) configClone.documentName = campShortTitle(camp)
  if (configClone.camp !== camp._meta.self) configClone.camp = camp._meta.self
  if (typeof configClone.contents?.map !== 'function') {
    configClone.contents = defaultContents
  }
  configClone.contents = configClone.contents
    .map((content) => {
      if (!content.type || !(content.type in componentRepairers)) return null
      const componentRepairer = componentRepairers[content.type]
      if (typeof componentRepairer !== 'function') return content
      return componentRepairer(content, camp)
    })
    .filter((component) => component)

  return configClone
}

export function repairPrintFilterConfig(config, camp, knownPeriods) {
  if (!config.options.filter || typeof config.options.filter !== 'object') {
    config.options.filter = {
      category: [],
      day: [],
      responsible: [],
      progressLabel: [],
    }
  }
  if (!config.options.filter.period) config.options.filter.period = null
  if (!knownPeriods.includes(config.options.filter.period))
    config.options.filter.period = null
  if (!config.options.filter.day) config.options.filter.day = []
  const knownDays = camp
    .periods()
    .items.flatMap((period) => period.days().items)
    .map((d) => d._meta.self)
  config.options.filter.day = config.options.filter.day.filter((day) => {
    return knownDays.includes(day)
  })
  if (!config.options.filter.category) config.options.filter.category = []
  const knownCategories = camp.categories().items.map((c) => c._meta.self)
  config.options.filter.category = config.options.filter.category.filter((category) => {
    return knownCategories.includes(category)
  })
  if (!config.options.filter.responsible) config.options.filter.responsible = []
  const knownCampCollaborations = camp.campCollaborations().items.map((c) => c._meta.self)
  if (!isEqual(config.options.filter.responsible, ['none'])) {
    config.options.filter.responsible = config.options.filter.responsible.filter(
      (responsible) => {
        return knownCampCollaborations.includes(responsible)
      }
    )
  }
  if (!config.options.filter.progressLabel) config.options.filter.progressLabel = []
  const knownProgressLabels = camp.progressLabels().items.map((l) => l._meta.self)
  config.options.filter.progressLabel = config.options.filter.progressLabel.filter(
    (progressLabel) => {
      return knownProgressLabels.includes(progressLabel) || 'none' === progressLabel
    }
  )
  return config
}
