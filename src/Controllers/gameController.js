import { db, dbConfig } from "../backend/database/dbConfig.js"
import { normalizeQuestSchedule, getQuestStartAtMs } from "../utils/questTiming.js"

const normalizeEmail = (email) => String(email || "").trim().toLowerCase()
const normalizeName = (name) => String(name || "").trim().toLowerCase()

const sortQuestions = (questions) => {
  return [...questions].sort((a, b) => {
    const aLevel = Number(a.level) || 0
    const bLevel = Number(b.level) || 0
    if (aLevel !== bLevel) return aLevel - bLevel

    const aTime = a.createdAt?._seconds || 0
    const bTime = b.createdAt?._seconds || 0
    return aTime - bTime
  })
}

export const loginPlayer = async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const normalizedEmail = normalizeEmail(email)
    const masterPassword = String(process.env.PLAYER_MASTER_PASSWORD || "").trim()

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: "email and password are required" })
    }

    if (!masterPassword) {
      return res.status(503).json({ error: "Server misconfigured. Set PLAYER_MASTER_PASSWORD." })
    }

    const inputPassword = String(password).trim()
    if (inputPassword !== masterPassword) {
      return res.status(401).json({ error: "Invalid password." })
    }

    const snapshot = await db
      .collection(dbConfig.COLLECTIONS.USERS)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return res.status(401).json({ error: "Email not registered. Contact admin." })
    }

    const player = snapshot.docs[0].data() || {}

    if (player.isBlocked) {
      return res.status(403).json({ error: "Your account is blocked. Contact admin." })
    }

    res.json({
      message: "Login successful",
      player: {
        id: snapshot.docs[0].id,
        email: player.email || normalizedEmail,
        name: player.name || "",
        score: Number(player.score) || 0,
        currentLevel: Number(player.currentLevel) || 1,
        completedLevels: Array.isArray(player.completedLevels) ? player.completedLevels : [],
        isBlocked: Boolean(player.isBlocked)
      }
    })
  } catch (error) {
    console.error("Error logging in player:", error)
    res.status(500).json({ error: "Failed to login" })
  }
}

export const getPublicQuests = async (req, res) => {
  try {
    const snapshot = await db.collection(dbConfig.COLLECTIONS.QUESTS).get()

    const quests = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((quest) => quest.isActive !== false)
      .map((quest) => ({
        id: quest.id,
        name: quest.name || "Untitled Quest",
        code: quest.code || "",
        description: quest.description || "",
        ...normalizeQuestSchedule(quest)
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))

    res.json(quests)
  } catch (error) {
    console.error("Error fetching public quests:", error)
    res.status(500).json({ error: "Failed to fetch quests" })
  }
}

export const getPublicQuestQuestions = async (req, res) => {
  try {
    const { questId } = req.params

    if (!questId) {
      return res.status(400).json({ error: "questId is required" })
    }

    const questDoc = await db.collection(dbConfig.COLLECTIONS.QUESTS).doc(String(questId)).get()
    if (!questDoc.exists) {
      return res.status(404).json({ error: "Quest not found" })
    }

    const snapshot = await db
      .collection(dbConfig.COLLECTIONS.QUESTIONS)
      .where("questId", "==", String(questId))
      .get()

    const questionDocs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))

    const questions = sortQuestions(questionDocs).map((question, index) => ({
      id: question.id,
      questId: question.questId,
      title: question.title || `Question ${index + 1}`,
      riddleText: question.riddleText || "",
      problemStatement: question.problemStatement || "",
      difficulty: question.difficulty || "Medium",
      level: Number(question.level) || index + 1,
      order: index + 1
    }))

    res.json({
      quest: {
        id: questDoc.id,
        name: questDoc.data()?.name || "Untitled Quest",
        code: questDoc.data()?.code || "",
        ...normalizeQuestSchedule(questDoc.data() || {}),
        startAtMs: getQuestStartAtMs(questDoc.data() || {})
      },
      questions
    })
  } catch (error) {
    console.error("Error fetching public quest questions:", error)
    res.status(500).json({ error: "Failed to fetch questions" })
  }
}
