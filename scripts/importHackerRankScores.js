import "dotenv/config"
import { readFile } from "node:fs/promises"
import process from "node:process"
import { db, dbConfig } from "../src/backend/database/dbConfig.js"

const DEFAULT_QUEST_ID = "22ac2493-ab66-478c-ae90-7b64604fc355"

const normalizeEmail = (email) => String(email || "").trim().toLowerCase()

const normalizeScore = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  return Math.round(parsed * 100) / 100
}

const splitCsvLine = (line) => {
  const result = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === "," && !inQuotes) {
      result.push(current)
      current = ""
      continue
    }

    current += ch
  }

  result.push(current)
  return result
}

const parseCsv = (rawCsv) => {
  const lines = String(rawCsv || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length <= 1) {
    return new Map()
  }

  const scoreMap = new Map()

  for (let i = 1; i < lines.length; i += 1) {
    const columns = splitCsvLine(lines[i])
    const email = normalizeEmail(columns[0])
    const score = normalizeScore(columns[2])

    if (!email) {
      continue
    }

    scoreMap.set(email, score)
  }

  return scoreMap
}

const chunkArray = (items, size) => {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const run = async () => {
  const csvPath = process.argv[2]
  const questId = String(process.argv[3] || DEFAULT_QUEST_ID).trim()

  if (!csvPath) {
    throw new Error("Usage: node scripts/importHackerRankScores.js <csv-path> [quest-id]")
  }

  if (!questId) {
    throw new Error("Quest ID is required")
  }

  const csvRaw = await readFile(csvPath, "utf8")
  const scoreMap = parseCsv(csvRaw)

  const progressSnapshot = await db
    .collection(dbConfig.COLLECTIONS.QUEST_PROGRESS)
    .where("questId", "==", questId)
    .get()

  if (progressSnapshot.empty) {
    console.log(`No quest progress found for questId=${questId}`)
    return
  }

  const progressRows = progressSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  const uniqueUserIds = [...new Set(
    progressRows
      .map((row) => String(row.userId || "").trim())
      .filter(Boolean),
  )]

  const userEmailMap = new Map()
  for (const userIdChunk of chunkArray(uniqueUserIds, 25)) {
    const userSnapshot = await db
      .collection(dbConfig.COLLECTIONS.USERS)
      .where("_id", "in", userIdChunk)
      .get()

    userSnapshot.docs.forEach((doc) => {
      const userData = doc.data() || {}
      userEmailMap.set(String(doc.id), normalizeEmail(userData.email))
    })
  }

  let matchedCount = 0
  let defaultedCount = 0
  let missingEmailCount = 0

  for (const row of progressRows) {
    const progressRef = db.collection(dbConfig.COLLECTIONS.QUEST_PROGRESS).doc(row.id)
    const userId = String(row.userId || "").trim()
    const resolvedEmail = normalizeEmail(row.playerEmail || userEmailMap.get(userId) || "")

    if (!resolvedEmail) {
      missingEmailCount += 1
    }

    const hasScore = resolvedEmail ? scoreMap.has(resolvedEmail) : false
    const hackerRankScore = hasScore ? scoreMap.get(resolvedEmail) : 0

    if (hasScore) {
      matchedCount += 1
    } else {
      defaultedCount += 1
    }

    await progressRef.set(
      {
        HackerRank_score: normalizeScore(hackerRankScore),
      },
      { merge: true },
    )
  }

  console.log(`HackerRank import completed for questId=${questId}`)
  console.log(`Quest progress rows processed: ${progressRows.length}`)
  console.log(`Matched email score rows: ${matchedCount}`)
  console.log(`Defaulted to 0 rows: ${defaultedCount}`)
  console.log(`Rows with missing email: ${missingEmailCount}`)
  console.log(`CSV rows parsed: ${scoreMap.size}`)
}

run()
  .catch((error) => {
    console.error("HackerRank import failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await dbConfig.closeConnection()
  })
