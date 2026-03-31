import admin from "firebase-admin"

// 👇 ENV se config le
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG)

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
    QUESTS: "quests",
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