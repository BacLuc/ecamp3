// Parses and normalizes the free-text time column of a storyboard section.
//
// The goal is to give a consistent HH:MM (24h) formatting for the common ways
// people enter times, while leaving anything we don't confidently understand
// untouched (custom values such as "after lunch" or "ca. 9h").
//
// Supported single values: "9", "9h", "0900", "930", "9:00", "9.30", "9h30".
// Supported ranges:        "9-10", "9:00 - 10:30" (en dash / em dash too).

function buildTime(hourString, minuteString) {
  const hour = parseInt(hourString, 10)
  const minute = parseInt(minuteString, 10)
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour > 23 || minute > 59) {
    return null
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseSingleTime(token) {
  const value = token.trim()
  if (value === '') {
    return null
  }

  // hour and minute separated by :, . or h/H, e.g. 9:00, 9.30, 9h30
  let match = value.match(/^(\d{1,2})[:.hH](\d{2})$/)
  if (match) {
    return buildTime(match[1], match[2])
  }

  // compact 3-4 digit form, e.g. 930 -> 09:30, 0900 -> 09:00
  match = value.match(/^(\d{3,4})$/)
  if (match) {
    const digits = match[1]
    return buildTime(digits.slice(0, -2), digits.slice(-2))
  }

  // hour only, optionally suffixed with h, e.g. 9, 09, 9h
  match = value.match(/^(\d{1,2})[hH]?$/)
  if (match) {
    return buildTime(match[1], '00')
  }

  return null
}

export function formatStoryboardTime(raw) {
  if (typeof raw !== 'string') {
    return raw
  }
  const value = raw.trim()
  if (value === '') {
    return raw
  }

  const single = parseSingleTime(value)
  if (single !== null) {
    return single
  }

  // Range: only reformat when both sides are understood, otherwise keep as-is.
  const parts = value.split(/\s*[-–—]\s*/)
  if (parts.length === 2) {
    const from = parseSingleTime(parts[0])
    const to = parseSingleTime(parts[1])
    if (from !== null && to !== null) {
      return `${from}–${to}`
    }
  }

  return raw
}
