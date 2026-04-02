import "dotenv/config"
import { db } from "../src/backend/database/dbConfig.js"
import admin from "../src/backend/firebase/firebaseConfig.js"

const DEFAULT_DURATION_MINUTES = 60

const resolveTimestampMs = (quest = {}) => {
  const candidates = [quest.startAtMs, quest.startAt, quest.createdAt, quest.updatedAt]

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.floor(value)
    }

    if (typeof value === "string" && value.trim()) {
      const parsedDate = Date.parse(value)
      if (!Number.isNaN(parsedDate)) {
        return parsedDate
      }
    }

    if (value && typeof value === "object") {
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
  }

  return Date.now()
}

const run = async () => {
  const snapshot = await db.collection("quests").get()

  if (snapshot.empty) {
    console.log("No quest documents found")
    return
  }

  const batch = db.batch()
  let updatedCount = 0

  snapshot.docs.forEach((doc) => {
    const quest = doc.data() || {}

    const startAtMs = resolveTimestampMs(quest)
    const durationMinutes = Number.isInteger(Number(quest.durationMinutes)) && Number(quest.durationMinutes) > 0
      ? Number(quest.durationMinutes)
      : DEFAULT_DURATION_MINUTES

    const needsUpdate =
      !Number.isFinite(Number(quest.durationMinutes)) ||
      !Number.isFinite(Number(quest.startAtMs)) ||
      !quest.startAt

    if (!needsUpdate) {
      return
    }

    batch.update(doc.ref, {
      durationMinutes,
      startAtMs,
      startAt: admin.firestore.Timestamp.fromMillis(startAtMs),
      updatedAt: new Date()
    })

    updatedCount += 1
  })

  if (updatedCount === 0) {
    console.log("All quests already have schedule fields")
    return
  }

  await batch.commit()
  console.log(`Backfill complete. Updated quests: ${updatedCount}`)
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill failed:", error)
    process.exit(1)
  })
