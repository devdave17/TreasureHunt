import { db, dbConfig } from "../backend/database/dbConfig.js"
import { normalizeQuestSchedule, getQuestStartAtMs } from "../utils/questTiming.js"
import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  invalidateQuestContentCache,
  invalidateQuestRankingCache,
  scheduleQuestDistributionBroadcast,
} from "./gameController.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DEFAULT_USERS_FILE = resolve(__dirname, "../../data/defaultUsers.json")

const normalizeUserPayload = (user) => {
  if (!user || typeof user !== "object") {
    return null
  }

  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : ""
  const name = typeof user.name === "string" ? user.name.trim() : ""
  const level = Number.isInteger(Number(user.level)) && Number(user.level) > 0
    ? Number(user.level)
    : 1

  if (!email || !name) {
    return null
  }

  return {
    email,
    name,
    currentLevel: level,
    isBlocked: Boolean(user.isBlocked ?? false),
    score: Number.isFinite(Number(user.score)) ? Number(user.score) : 0,
    completedLevels: Array.isArray(user.completedLevels) ? user.completedLevels : [],
    createdAt: new Date(),
    lastActive: new Date()
  }
}

const importUsers = async (inputUsers) => {
  if (!Array.isArray(inputUsers) || inputUsers.length === 0) {
    return {
      created: 0,
      skippedInvalid: 0,
      skippedDuplicate: 0,
      createdIds: []
    }
  }

  let created = 0
  let skippedInvalid = 0
  let skippedDuplicate = 0
  const createdIds = []

  for (const rawUser of inputUsers) {
    const user = normalizeUserPayload(rawUser)

    if (!user) {
      skippedInvalid += 1
      continue
    }

    const existing = await db
      .collection(dbConfig.COLLECTIONS.USERS)
      .where("email", "==", user.email)
      .limit(1)
      .get()

    if (!existing.empty) {
      skippedDuplicate += 1
      continue
    }

    const docRef = await db.collection(dbConfig.COLLECTIONS.USERS).add(user)
    createdIds.push(docRef.id)
    created += 1
  }

  return {
    created,
    skippedInvalid,
    skippedDuplicate,
    createdIds
  }
}

// ✅ ADD USER (CREATE NEW USER)
export const addUser = async (req, res) => {
  try {
    const { email, name, level = 1 } = req.body

    // Validation
    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" })
    }

    // Check if user already exists
    const existingUser = await db.collection(dbConfig.COLLECTIONS.USERS)
      .where("email", "==", email)
      .limit(1)
      .get()

    if (!existingUser.empty) {
      return res.status(409).json({ error: "User with this email already exists" })
    }

    // Create new user document
    const newUser = {
      email,
      name,
      currentLevel: level,
      isBlocked: false,
      score: 0,
      completedLevels: [],
      createdAt: new Date(),
      lastActive: new Date()
    }

    const docRef = await db.collection(dbConfig.COLLECTIONS.USERS).add(newUser)

    res.status(201).json({
      message: "User created successfully",
      userId: docRef.id,
      user: { id: docRef.id, ...newUser }
    })
  } catch (error) {
    console.error("Error adding user:", error)
    res.status(500).json({ error: "Failed to add user" })
  }
}

// ✅ GET USERS
export const getUsers = async (req, res) => {
  try {
    const snapshot = await db.collection(dbConfig.COLLECTIONS.USERS).get()

    const users = snapshot.docs.map((doc) => {
      const userData = doc.data() || {}

      return {
        id: doc.id,
        ...userData,
      }
    })

    res.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    res.status(500).json({ error: "Failed to fetch users" })
  }
}

// ✅ BLOCK USER
export const blockUser = async (req, res) => {
  try {
    const { userId, isBlocked = true } = req.body

    if (!userId) {
      return res.status(400).json({ error: "userId is required" })
    }

    const shouldBlock = Boolean(isBlocked)
    const userRef = db.collection(dbConfig.COLLECTIONS.USERS).doc(userId)

    await userRef.update({
      isBlocked: shouldBlock,
      ...(shouldBlock
        ? {
            score: 0,
            currentLevel: 1,
            completedLevels: [],
            disqualificationReason: "UMF",
            disqualifiedAt: new Date(),
          }
        : {
            disqualificationReason: null,
            disqualifiedAt: null,
          }),
      updatedAt: new Date(),
    })

    if (shouldBlock) {
      const progressSnapshot = await db
        .collection(dbConfig.COLLECTIONS.QUEST_PROGRESS)
        .where("userId", "==", String(userId))
        .get()

      const affectedQuestIds = new Set()

      for (const doc of progressSnapshot.docs) {
        const progressData = doc.data() || {}
        if (progressData.questId) {
          affectedQuestIds.add(String(progressData.questId))
        }
        await doc.ref.delete()
      }

      affectedQuestIds.forEach((questId) => {
        invalidateQuestContentCache(questId)
        invalidateQuestRankingCache(questId)
        scheduleQuestDistributionBroadcast(req.io, questId)
      })
    }

    if (req.io) {
      req.io.emit("player-blocked", {
        userId: String(userId),
        isBlocked: shouldBlock,
        reason: shouldBlock ? "UMF" : null,
        message: shouldBlock
          ? "You have been blocked by the invigilator due to UMF (Unfair Means)."
          : "You have been unblocked by the invigilator.",
      })
    }
  } catch (error) {
    console.error("Error blocking user:", error)
    res.status(500).json({ error: "Failed to block user" })
  }
}

// ✅ UPDATE LEVEL
export const updateLevel = async (req, res) => {
  try {
    const { userId, level } = req.body

    await db.collection("users").doc(userId).update({
      currentLevel: level
    })

    res.json({ message: "Level updated" })
  } catch (error) {
    res.status(500).json({ error: "Failed to update level" })
  }
}

// ✅ BULK ADD USERS FROM JSON BODY
export const bulkAddUsers = async (req, res) => {
  try {
    const users = Array.isArray(req.body) ? req.body : req.body?.users

    if (!Array.isArray(users)) {
      return res.status(400).json({
        error: "Invalid payload. Send an array of users or { users: [...] }"
      })
    }

    const result = await importUsers(users)

    res.status(201).json({
      message: "Bulk user import completed",
      ...result
    })
  } catch (error) {
    console.error("Error importing users in bulk:", error)
    res.status(500).json({ error: "Failed to import users" })
  }
}

// ✅ SEED DEFAULT USERS FROM data/defaultUsers.json
export const seedUsersFromFile = async (req, res) => {
  try {
    const rawJson = await readFile(DEFAULT_USERS_FILE, "utf8")
    const parsed = JSON.parse(rawJson)
    const users = Array.isArray(parsed) ? parsed : parsed?.users

    if (!Array.isArray(users)) {
      return res.status(400).json({
        error: "defaultUsers.json must contain an array or { users: [...] }"
      })
    }

    const result = await importUsers(users)

    res.status(201).json({
      message: "Default users seeded successfully",
      file: "data/defaultUsers.json",
      ...result
    })
  } catch (error) {
    console.error("Error seeding users from file:", error)
    res.status(500).json({ error: "Failed to seed users from file" })
  }
}

// ✅ DELETE SINGLE USER
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params

    if (!userId) {
      return res.status(400).json({ error: "userId is required" })
    }

    await db.collection(dbConfig.COLLECTIONS.USERS).doc(userId).delete()

    res.json({ message: "User deleted successfully", userId })
  } catch (error) {
    console.error("Error deleting user:", error)
    res.status(500).json({ error: "Failed to delete user" })
  }
}

// ✅ DELETE ALL USERS
export const deleteAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection(dbConfig.COLLECTIONS.USERS).get()

    if (snapshot.empty) {
      return res.json({ message: "No users found to delete", deleted: 0 })
    }

    const batch = db.batch()

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()

    res.json({
      message: "All users deleted successfully",
      deleted: snapshot.size
    })
  } catch (error) {
    console.error("Error deleting all users:", error)
    res.status(500).json({ error: "Failed to delete all users" })
  }
}

// ✅ GET QUESTS
export const getQuests = async (req, res) => {
  try {
    const snapshot = await db.collection(dbConfig.COLLECTIONS.QUESTS).get()
    const quests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...normalizeQuestSchedule(doc.data() || {})
    }))

    quests.sort((a, b) => {
      const aStart = Number(a.startAtMs) || 0
      const bStart = Number(b.startAtMs) || 0
      if (aStart !== bStart) return aStart - bStart

      const aName = String(a.name || "").toLowerCase()
      const bName = String(b.name || "").toLowerCase()
      return aName.localeCompare(bName)
    })

    res.json(quests)
  } catch (error) {
    console.error("Error fetching quests:", error)
    res.status(500).json({ error: "Failed to fetch quests" })
  }
}

// ✅ ADD QUEST
export const addQuest = async (req, res) => {
  try {
    const {
      name,
      code = "",
      description = "",
      durationMinutes = 60,
      startAtMs,
      isActive = true
    } = req.body

    const questName = String(name || "").trim()
    const questCode = String(code || "").trim().toUpperCase()
    const parsedDurationMinutes = Number(durationMinutes)
    const parsedStartAtMs = getQuestStartAtMs({ startAtMs })

    if (!questName) {
      return res.status(400).json({ error: "Quest name is required" })
    }

    if (!Number.isInteger(parsedDurationMinutes) || parsedDurationMinutes < 1) {
      return res.status(400).json({ error: "Time duration must be a positive whole number" })
    }

    if (questCode) {
      const existing = await db
        .collection(dbConfig.COLLECTIONS.QUESTS)
        .where("code", "==", questCode)
        .limit(1)
        .get()

      if (!existing.empty) {
        return res.status(409).json({ error: "Quest code already exists" })
      }
    }

    const quest = {
      name: questName,
      code: questCode,
      description: String(description || "").trim(),
      durationMinutes: parsedDurationMinutes,
      startAtMs: parsedStartAtMs,
      startAt: new Date(parsedStartAtMs),
      isActive: Boolean(isActive),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const docRef = await db.collection(dbConfig.COLLECTIONS.QUESTS).add(quest)

    res.status(201).json({
      message: "Quest created successfully",
      quest: { id: docRef.id, ...quest }
    })

    req.io?.emit("quest-changed", {
      action: "created",
      quest: { id: docRef.id, ...normalizeQuestSchedule(quest) }
    })

    invalidateQuestContentCache(docRef.id)
    invalidateQuestRankingCache(docRef.id)
  } catch (error) {
    console.error("Error adding quest:", error)
    res.status(500).json({ error: "Failed to add quest" })
  }
}

// ✅ UPDATE QUEST
export const updateQuest = async (req, res) => {
  try {
    const { questId } = req.params
    const {
      name,
      code = "",
      description = "",
      durationMinutes = 60,
      startAtMs,
      isActive = true
    } = req.body

    if (!questId) {
      return res.status(400).json({ error: "questId is required" })
    }

    const questName = String(name || "").trim()
    const questCode = String(code || "").trim().toUpperCase()
    const parsedDurationMinutes = Number(durationMinutes)
    const parsedStartAtMs = getQuestStartAtMs({ startAtMs })

    if (!questName) {
      return res.status(400).json({ error: "Quest name is required" })
    }

    if (!Number.isInteger(parsedDurationMinutes) || parsedDurationMinutes < 1) {
      return res.status(400).json({ error: "Time duration must be a positive whole number" })
    }

    if (questCode) {
      const existing = await db
        .collection(dbConfig.COLLECTIONS.QUESTS)
        .where("code", "==", questCode)
        .limit(1)
        .get()

      const duplicate = existing.docs.find((doc) => doc.id !== questId)
      if (duplicate) {
        return res.status(409).json({ error: "Quest code already exists" })
      }
    }

    await db.collection(dbConfig.COLLECTIONS.QUESTS).doc(questId).update({
      name: questName,
      code: questCode,
      description: String(description || "").trim(),
      durationMinutes: parsedDurationMinutes,
      startAtMs: parsedStartAtMs,
      startAt: new Date(parsedStartAtMs),
      isActive: Boolean(isActive),
      updatedAt: new Date()
    })

    res.json({ message: "Quest updated successfully", questId })

    req.io?.emit("quest-changed", {
      action: "updated",
      quest: {
        id: questId,
        name: questName,
        code: questCode,
        description: String(description || "").trim(),
        durationMinutes: parsedDurationMinutes,
        startAtMs: parsedStartAtMs,
        startAt: new Date(parsedStartAtMs),
        isActive: Boolean(isActive),
        updatedAt: new Date()
      }
    })

    invalidateQuestContentCache(questId)
    invalidateQuestRankingCache(questId)
  } catch (error) {
    console.error("Error updating quest:", error)
    res.status(500).json({ error: "Failed to update quest" })
  }
}

// ✅ DELETE QUEST
export const deleteQuest = async (req, res) => {
  try {
    const { questId } = req.params

    if (!questId) {
      return res.status(400).json({ error: "questId is required" })
    }

    const questionsSnapshot = await db
      .collection(dbConfig.COLLECTIONS.QUESTIONS)
      .where("questId", "==", questId)
      .get()

    const bulkWriter = db.bulkWriter()
    questionsSnapshot.docs.forEach((doc) => {
      bulkWriter.delete(doc.ref)
    })
    bulkWriter.delete(db.collection(dbConfig.COLLECTIONS.QUESTS).doc(questId))

    await bulkWriter.close()

    req.io?.emit("quest-changed", {
      action: "deleted",
      questId
    })

    invalidateQuestContentCache(questId)
    invalidateQuestRankingCache(questId)

    res.json({
      message: "Quest deleted successfully",
      questId,
      deletedQuestions: questionsSnapshot.size
    })
  } catch (error) {
    console.error("Error deleting quest:", error)
    res.status(500).json({ error: "Failed to delete quest" })
  }
}

// ✅ GET QUESTIONS
export const getQuestions = async (req, res) => {
  try {
    const { questId } = req.query

    let query = db.collection(dbConfig.COLLECTIONS.QUESTIONS)
    if (questId) {
      query = query.where("questId", "==", questId)
    }

    const snapshot = await query.get()

    const questions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))

    res.json(questions)
  } catch (error) {
    console.error("Error fetching questions:", error)
    res.status(500).json({ error: "Failed to fetch questions" })
  }
}

// ✅ ADD QUESTION
export const addQuestion = async (req, res) => {
  try {
    const {
      questId,
      level,
      title,
      riddleText = "",
      problemStatement = "",
      correctAnswer,
      acceptedAnswers = [],
      answerValidationMode = "flexible",
      score = 10,
      difficulty = "Medium"
    } = req.body

    if (!questId || !String(questId).trim()) {
      return res.status(400).json({ error: "questId is required" })
    }

    const questDoc = await db.collection(dbConfig.COLLECTIONS.QUESTS).doc(String(questId)).get()
    if (!questDoc.exists) {
      return res.status(404).json({ error: "Selected quest not found" })
    }

    const parsedLevel = Number(level)

    if (!Number.isInteger(parsedLevel) || parsedLevel < 1) {
      return res.status(400).json({ error: "Level must be a positive integer" })
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Title is required" })
    }

    if (!correctAnswer || !String(correctAnswer).trim()) {
      return res.status(400).json({ error: "Correct answer is required" })
    }

    const parsedScore = Number(score)
    if (!Number.isInteger(parsedScore) || parsedScore < 1) {
      return res.status(400).json({ error: "Score must be a positive whole number" })
    }

    const parsedAcceptedAnswers = Array.isArray(acceptedAnswers)
      ? [...new Set(
          acceptedAnswers
            .map((entry) => String(entry || "").trim())
            .filter(Boolean),
        )]
      : []

    const normalizedValidationMode = ["strict", "flexible"].includes(
      String(answerValidationMode || "").toLowerCase(),
    )
      ? String(answerValidationMode).toLowerCase()
      : "flexible"

    const question = {
      questId: String(questId),
      questName: String(questDoc.data()?.name || ""),
      level: parsedLevel,
      title: String(title).trim(),
      riddleText: String(riddleText || "").trim(),
      problemStatement: String(problemStatement || "").trim(),
      correctAnswer: String(correctAnswer).trim(),
      acceptedAnswers: parsedAcceptedAnswers,
      answerValidationMode: normalizedValidationMode,
      score: parsedScore,
      difficulty: ["Easy", "Medium", "Hard"].includes(difficulty) ? difficulty : "Medium",
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const docRef = await db.collection(dbConfig.COLLECTIONS.QUESTIONS).add(question)

    invalidateQuestContentCache(String(questId))
    invalidateQuestRankingCache(String(questId))
    scheduleQuestDistributionBroadcast(req.io, String(questId))

    res.status(201).json({
      message: "Question added successfully",
      question: {
        id: docRef.id,
        ...question
      }
    })
  } catch (error) {
    console.error("Error adding question:", error)
    res.status(500).json({ error: "Failed to add question" })
  }
}

// ✅ UPDATE QUESTION
export const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params
    const {
      questId,
      level,
      title,
      riddleText = "",
      problemStatement = "",
      correctAnswer,
      acceptedAnswers = [],
      answerValidationMode = "flexible",
      score = 10,
      difficulty = "Medium"
    } = req.body

    if (!questionId) {
      return res.status(400).json({ error: "questionId is required" })
    }

    if (!questId || !String(questId).trim()) {
      return res.status(400).json({ error: "questId is required" })
    }

    const questDoc = await db.collection(dbConfig.COLLECTIONS.QUESTS).doc(String(questId)).get()
    if (!questDoc.exists) {
      return res.status(404).json({ error: "Selected quest not found" })
    }

    const parsedLevel = Number(level)
    if (!Number.isInteger(parsedLevel) || parsedLevel < 1) {
      return res.status(400).json({ error: "Level must be a positive integer" })
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Title is required" })
    }

    if (!correctAnswer || !String(correctAnswer).trim()) {
      return res.status(400).json({ error: "Correct answer is required" })
    }

    const parsedScore = Number(score)
    if (!Number.isInteger(parsedScore) || parsedScore < 1) {
      return res.status(400).json({ error: "Score must be a positive whole number" })
    }

    const parsedAcceptedAnswers = Array.isArray(acceptedAnswers)
      ? [...new Set(
          acceptedAnswers
            .map((entry) => String(entry || "").trim())
            .filter(Boolean),
        )]
      : []

    const normalizedValidationMode = ["strict", "flexible"].includes(
      String(answerValidationMode || "").toLowerCase(),
    )
      ? String(answerValidationMode).toLowerCase()
      : "flexible"

    const updates = {
      questId: String(questId),
      questName: String(questDoc.data()?.name || ""),
      level: parsedLevel,
      title: String(title).trim(),
      riddleText: String(riddleText || "").trim(),
      problemStatement: String(problemStatement || "").trim(),
      correctAnswer: String(correctAnswer).trim(),
      acceptedAnswers: parsedAcceptedAnswers,
      answerValidationMode: normalizedValidationMode,
      score: parsedScore,
      difficulty: ["Easy", "Medium", "Hard"].includes(difficulty) ? difficulty : "Medium",
      updatedAt: new Date()
    }

    await db.collection(dbConfig.COLLECTIONS.QUESTIONS).doc(questionId).update(updates)

    invalidateQuestContentCache(String(questId))
    invalidateQuestRankingCache(String(questId))
    scheduleQuestDistributionBroadcast(req.io, String(questId))

    res.json({ message: "Question updated successfully", questionId })
  } catch (error) {
    console.error("Error updating question:", error)
    res.status(500).json({ error: "Failed to update question" })
  }
}

// ✅ DELETE QUESTION
export const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params

    if (!questionId) {
      return res.status(400).json({ error: "questionId is required" })
    }

    const existingQuestion = await db
      .collection(dbConfig.COLLECTIONS.QUESTIONS)
      .doc(questionId)
      .get()

    const existingQuestionData = existingQuestion.exists ? existingQuestion.data() || {} : {}

    await db.collection(dbConfig.COLLECTIONS.QUESTIONS).doc(questionId).delete()

    if (existingQuestionData.questId) {
      invalidateQuestContentCache(String(existingQuestionData.questId))
      invalidateQuestRankingCache(String(existingQuestionData.questId))
      scheduleQuestDistributionBroadcast(req.io, String(existingQuestionData.questId))
    }

    res.json({ message: "Question deleted successfully", questionId })
  } catch (error) {
    console.error("Error deleting question:", error)
    res.status(500).json({ error: "Failed to delete question" })
  }
}