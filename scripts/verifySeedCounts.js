import "dotenv/config"
import { db, dbConfig } from "../src/backend/database/dbConfig.js"

const questCodes = ["AA-2026", "DSD-2026", "DD-2026"]

const run = async () => {
  for (const code of questCodes) {
    const questSnapshot = await db.collection(dbConfig.COLLECTIONS.QUESTS).where("code", "==", code).limit(1).get()
    if (questSnapshot.empty) {
      console.log(`${code}: quest not found`)
      continue
    }

    const questDoc = questSnapshot.docs[0]
    const questId = questDoc.id
    const questionsSnapshot = await db.collection(dbConfig.COLLECTIONS.QUESTIONS).where("questId", "==", questId).get()

    console.log(`${code}: questId=${questId} questions=${questionsSnapshot.size}`)
  }
}

run()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await dbConfig.closeConnection()
  })
