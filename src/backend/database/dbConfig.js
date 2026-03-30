import admin from "firebase-admin"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const serviceAccountPath = resolve(
  __dirname,
  "../../../coding-club-fab75-firebase-adminsdk-fbsvc-d69be385d6.json"
)
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"))

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.firestore()

// Database configuration
export const dbConfig = {
  // Collections
  COLLECTIONS: {
    USERS: "users",
    LEVELS: "levels",
    SCOREBOARD: "scoreboard",
    CLUES: "clues",
    QUESTIONS: "questions"
  },

  // User schema default values
  USER_DEFAULTS: {
    createdAt: new Date(),
    currentLevel: 1,
    isBlocked: false,
    score: 0,
    completedLevels: [],
    lastActive: new Date()
  },

  // Get Firestore instance
  getDb: () => db,

  // Close connection (if needed)
  closeConnection: async () => {
    await db.terminate()
  }
}

export { db }
