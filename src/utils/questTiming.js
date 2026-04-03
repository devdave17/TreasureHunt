const pad = (value) => String(value).padStart(2, "0")

const normalizeTimestampLike = (value) => {
  if (!value) {
    return null
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value)
  }

  if (typeof value === "string" && value.trim()) {
    const parsedDate = Date.parse(value)
    if (!Number.isNaN(parsedDate)) {
      return parsedDate
    }
  }

  if (typeof value === "object") {
    if (value instanceof Date) {
      return value.getTime()
    }

    if (typeof value.toMillis === "function") {
      const millis = Number(value.toMillis())
      if (Number.isFinite(millis)) {
        return Math.floor(millis)
      }
    }

    if (Number.isFinite(Number(value.seconds))) {
      return Math.floor(Number(value.seconds) * 1000)
    }

    if (Number.isFinite(Number(value._seconds))) {
      return Math.floor(Number(value._seconds) * 1000)
    }
  }

  return null
}

export const getQuestStartAtMs = (quest) => {
  const startAtValue = quest?.startAtMs ?? quest?.startAt
  const normalizedValue = normalizeTimestampLike(startAtValue)

  if (Number.isFinite(normalizedValue) && normalizedValue > 0) {
    return normalizedValue
  }

  return Date.now()
}

export const getQuestDurationMinutes = (quest, fallbackMinutes = 60) => {
  const parsedDuration = Number(quest?.durationMinutes)
  return Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : fallbackMinutes
}

export const getQuestDurationSeconds = (quest, fallbackMinutes = 60) => {
  return getQuestDurationMinutes(quest, fallbackMinutes) * 60
}

export const formatCountdownLabel = (secondsTotal) => {
  const totalSeconds = Math.max(0, Math.ceil(Number(secondsTotal) || 0))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`
  }

  if (minutes > 0) {
    return `${minutes}m ${pad(seconds)}s`
  }

  return `${seconds}s`
}

export const formatDateTimeLabel = (value) => {
  const timestamp = getQuestStartAtMs({ startAtMs: value })
  return new Date(timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  })
}

export const toDateTimeLocalValue = (value) => {
  const timestamp = getQuestStartAtMs({ startAtMs: value })
  const date = new Date(timestamp)
  const offsetMs = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

export const normalizeQuestSchedule = (quest) => ({
  ...quest,
  startAtMs: getQuestStartAtMs(quest),
  durationMinutes: getQuestDurationMinutes(quest, 60)
})

export const getQuestLiveState = (quest, now = Date.now()) => {
  const startAtMs = getQuestStartAtMs(quest)
  const secondsUntilLive = Math.max(0, Math.ceil((startAtMs - now) / 1000))
  const isLive = secondsUntilLive === 0

  return {
    startAtMs,
    isLive,
    secondsUntilLive,
    countdownLabel: formatCountdownLabel(secondsUntilLive),
    liveLabel: isLive ? "Live now" : `Live in ${formatCountdownLabel(secondsUntilLive)}`
  }
}