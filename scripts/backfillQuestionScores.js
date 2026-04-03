import "dotenv/config"
import { db } from "../src/backend/database/dbConfig.js"

const DEFAULT_SCORE = 10

const run = async () => {
  const snapshot = await db.collection("questions").get()

  if (snapshot.empty) {
    console.log("No question documents found")
    return
  }

  const batch = db.batch()
  let updatedCount = 0

  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {}
    const parsedScore = Number(data.score)

    if (Number.isInteger(parsedScore) && parsedScore > 0) {
      return
    }

    batch.update(doc.ref, {
      score: DEFAULT_SCORE,
      updatedAt: new Date()
    })

    updatedCount += 1
  })

  if (updatedCount === 0) {
    console.log("All questions already have a valid score")
    return
  }

  await batch.commit()
  console.log(`Question score backfill complete. Updated: ${updatedCount}`)
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Question score backfill failed:", error)
    process.exit(1)
  })
