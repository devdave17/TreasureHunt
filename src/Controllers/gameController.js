import { db, dbConfig } from "../backend/database/dbConfig.js";
import {
  normalizeQuestSchedule,
  getQuestStartAtMs,
} from "../utils/questTiming.js";
import process from "node:process";
import dotenv from "dotenv";

dotenv.config({ override: true });

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

const sortQuestions = (questions) => {
  return [...questions].sort((a, b) => {
    const aLevel = Number(a.level) || 0;
    const bLevel = Number(b.level) || 0;
    if (aLevel !== bLevel) return aLevel - bLevel;

    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt?._seconds || 0;
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : b.createdAt?._seconds || 0;
    return aTime - bTime;
  });
};

const normalizeAnswer = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const buildQuestProgressId = (userId, questId) =>
  `${String(userId || "").trim()}_${String(questId || "").trim()}`;

const getQuestProgressDocRef = (userId, questId) => {
  const progressId = buildQuestProgressId(userId, questId);
  return db.collection(dbConfig.COLLECTIONS.QUEST_PROGRESS).doc(progressId);
};

const normalizeTimestampLike = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate)) {
      return parsedDate;
    }
  }

  if (typeof value === "object") {
    if (value instanceof Date) {
      return Math.floor(value.getTime());
    }

    if (typeof value.toMillis === "function") {
      const millis = Number(value.toMillis());
      if (Number.isFinite(millis)) {
        return Math.floor(millis);
      }
    }

    if (Number.isFinite(Number(value.seconds))) {
      return Math.floor(Number(value.seconds) * 1000);
    }

    if (Number.isFinite(Number(value._seconds))) {
      return Math.floor(Number(value._seconds) * 1000);
    }
  }

  return null;
};

const getQuestElapsedSeconds = (progress = {}) => {
  const questStartMs = normalizeTimestampLike(progress.questStartTime);
  if (!Number.isFinite(questStartMs)) {
    return null;
  }

  const lastActiveMs =
    normalizeTimestampLike(progress.lastActive) ||
    normalizeTimestampLike(progress.updatedAt) ||
    questStartMs;

  return Math.max(0, Math.floor((lastActiveMs - questStartMs) / 1000));
};

const sumQuestionCompletionSeconds = (questionCompletionSeconds) => {
  if (!questionCompletionSeconds || typeof questionCompletionSeconds !== "object") {
    return null;
  }

  const total = Object.values(questionCompletionSeconds).reduce((accumulator, value) => {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return accumulator;
    }

    return accumulator + seconds;
  }, 0);

  return total;
};

export const loginPlayer = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const masterPassword = String(
      process.env.PLAYER_MASTER_PASSWORD || "",
    ).trim();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    if (!masterPassword) {
      return res
        .status(503)
        .json({ error: "Server misconfigured. Set PLAYER_MASTER_PASSWORD." });
    }

    const inputPassword = String(password).trim();
    if (inputPassword !== masterPassword) {
      return res.status(401).json({ error: "Invalid password." });
    }

    const snapshot = await db
      .collection(dbConfig.COLLECTIONS.USERS)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res
        .status(401)
        .json({ error: "Email not registered. Contact admin." });
    }

    const player = snapshot.docs[0].data() || {};

    if (player.isBlocked) {
      return res
        .status(403)
        .json({ error: "Your account is blocked. Contact admin." });
    }

    res.json({
      message: "Login successful",
      player: {
        id: snapshot.docs[0].id,
        email: player.email || normalizedEmail,
        name: player.name || "",
        score: Number(player.score) || 0,
        currentLevel: Number(player.currentLevel) || 1,
        completedLevels: Array.isArray(player.completedLevels)
          ? player.completedLevels
          : [],
        isBlocked: Boolean(player.isBlocked),
      },
    });
  } catch (error) {
    console.error("Error logging in player:", error);
    res.status(500).json({ error: "Failed to login" });
  }
};

export const getPublicQuests = async (req, res) => {
  try {
    const snapshot = await db.collection(dbConfig.COLLECTIONS.QUESTS).get();

    const quests = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((quest) => quest.isActive !== false)
      .map((quest) => ({
        id: quest.id,
        name: quest.name || "Untitled Quest",
        code: quest.code || "",
        description: quest.description || "",
        ...normalizeQuestSchedule(quest),
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    res.json(quests);
  } catch (error) {
    console.error("Error fetching public quests:", error);
    res.status(500).json({ error: "Failed to fetch quests" });
  }
};

export const getPublicQuestQuestions = async (req, res) => {
  try {
    const { questId } = req.params;

    if (!questId) {
      return res.status(400).json({ error: "questId is required" });
    }

    const questDoc = await db
      .collection(dbConfig.COLLECTIONS.QUESTS)
      .doc(String(questId))
      .get();
    if (!questDoc.exists) {
      return res.status(404).json({ error: "Quest not found" });
    }

    const snapshot = await db
      .collection(dbConfig.COLLECTIONS.QUESTIONS)
      .where("questId", "==", String(questId))
      .get();

    const questionDocs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const questions = sortQuestions(questionDocs).map((question, index) => ({
      id: question.id,
      questId: question.questId,
      title: question.title || `Question ${index + 1}`,
      riddleText: question.riddleText || "",
      problemStatement: question.problemStatement || "",
      difficulty: question.difficulty || "Medium",
      score: Number(question.score) || 10,
      level: Number(question.level) || index + 1,
      order: index + 1,
    }));

    res.json({
      quest: {
        id: questDoc.id,
        name: questDoc.data()?.name || "Untitled Quest",
        code: questDoc.data()?.code || "",
        ...normalizeQuestSchedule(questDoc.data() || {}),
        startAtMs: getQuestStartAtMs(questDoc.data() || {}),
      },
      questions,
    });
  } catch (error) {
    console.error("Error fetching public quest questions:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};

export const getQuestRanking = async (req, res) => {
  try {
    const { questId } = req.params;

    if (!questId) {
      return res.status(400).json({ error: "questId is required" });
    }

    const questDoc = await db
      .collection(dbConfig.COLLECTIONS.QUESTS)
      .doc(String(questId))
      .get();

    if (!questDoc.exists) {
      return res.status(404).json({ error: "Quest not found" });
    }

    const questData = questDoc.data() || {};
    const progressSnapshot = await db
      .collection(dbConfig.COLLECTIONS.QUEST_PROGRESS)
      .where("questId", "==", String(questId))
      .get();

    const progressRows = progressSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const userIds = [...new Set(
      progressRows
        .map((row) => String(row.userId || "").trim())
        .filter(Boolean),
    )];

    const userMap = new Map();
    if (userIds.length > 0) {
      const userSnapshot = await db
        .collection(dbConfig.COLLECTIONS.USERS)
        .where("_id", "in", userIds)
        .get();

      userSnapshot.docs.forEach((doc) => {
        userMap.set(String(doc.id), doc.data() || {});
      });
    }

    const rankings = progressRows
      .map((progress) => {
        const completedQuestionLevels = Array.isArray(progress.completedQuestionLevels)
          ? progress.completedQuestionLevels
          : [];
        const normalizedCompletedLevels = completedQuestionLevels
          .map((entry) => {
            if (entry && typeof entry === "object") {
              return Number(entry.questionLevel || entry.level || entry.currentLevel)
            }

            return Number(entry)
          })
          .filter((level) => Number.isFinite(level))
          .sort((a, b) => a - b);
        const totalScore = Number(progress.totalScore) || Number(progress.score) || 0;
        const elapsedSeconds = getQuestElapsedSeconds(progress);
        const userData = userMap.get(String(progress.userId || "").trim()) || {};
        const questionCompletionSeconds =
          progress.questionCompletionSeconds && typeof progress.questionCompletionSeconds === "object"
            ? progress.questionCompletionSeconds
            : {};
        const totalSolveSeconds = sumQuestionCompletionSeconds(questionCompletionSeconds);

        return {
          userId: String(progress.userId || ""),
          name: String(userData.name || progress.playerName || "Unknown player"),
          email: String(userData.email || progress.playerEmail || ""),
          progressId: progress.id,
          totalScore,
          solvedQuestions: normalizedCompletedLevels.length,
          totalCompletionSeconds:
            Number.isFinite(totalSolveSeconds) && totalSolveSeconds >= 0
              ? totalSolveSeconds
              : elapsedSeconds,
          totalElapsedSeconds: elapsedSeconds,
          currentLevel: Number(progress.currentLevel) || Number(progress.currentQuestionLevel) || 0,
          completedQuestionLevels: normalizedCompletedLevels,
          questionCompletionSeconds,
          questStartTime: progress.questStartTime || null,
          questionStartTime: progress.questionStartTime || null,
          lastActive: progress.lastActive || progress.updatedAt || null,
          progressUpdatedAt: progress.updatedAt || null,
        };
      })
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }

        if (b.solvedQuestions !== a.solvedQuestions) {
          return b.solvedQuestions - a.solvedQuestions;
        }

        const aTime = Number.isFinite(a.totalCompletionSeconds)
          ? a.totalCompletionSeconds
          : Number.POSITIVE_INFINITY;
        const bTime = Number.isFinite(b.totalCompletionSeconds)
          ? b.totalCompletionSeconds
          : Number.POSITIVE_INFINITY;

        if (aTime !== bTime) {
          return aTime - bTime;
        }

        const aUpdated = normalizeTimestampLike(a.lastActive) || 0;
        const bUpdated = normalizeTimestampLike(b.lastActive) || 0;
        return aUpdated - bUpdated;
      })
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));

    const questionSnapshot = await db
      .collection(dbConfig.COLLECTIONS.QUESTIONS)
      .where("questId", "==", String(questId))
      .get();

    res.json({
      quest: {
        id: questDoc.id,
        name: questData.name || "Untitled Quest",
        code: questData.code || "",
        description: questData.description || "",
        ...normalizeQuestSchedule(questData),
        totalQuestions: questionSnapshot.size,
      },
      summary: {
        participantCount: rankings.length,
        completedCount: rankings.filter((row) => row.solvedQuestions > 0).length,
      },
      rankings,
    });
  } catch (error) {
    console.error("Error fetching quest ranking:", error);
    res.status(500).json({ error: "Failed to fetch ranking" });
  }
};

export const updatePlayerProgress = async (req, res) => {
  try {
    const { userId, questId, questionId, level, points } = req.body || {};

    console.log("[updatePlayerProgress] request", {
      userId,
      questId,
      questionId,
      level,
      points,
    });

    if (!userId || !questId || !level) {
      return res.status(400).json({ error: "userId, questId and level are required" });
    }

    const currentCompletedAt = new Date();
    const parsedLevel = Number(level) || 1;
    const questDoc = await db
      .collection(dbConfig.COLLECTIONS.QUESTS)
      .doc(String(questId))
      .get();
    const questData = questDoc.exists ? questDoc.data() || {} : {};

    const questProgressRef = getQuestProgressDocRef(userId, questId);
    console.log("[updatePlayerProgress] questProgress doc", {
      docId: questProgressRef.id,
      path: questProgressRef.path,
    });
    const questProgressSnap = await questProgressRef.get();
    const questProgressData = questProgressSnap.exists ? questProgressSnap.data() || {} : {};
    const questStartTime = questProgressData.questStartTime || new Date();
    const currentScore = Number(questProgressData.totalScore) || Number(questProgressData.score) || 0;
    const completedQuestionLevels = Array.isArray(questProgressData.completedQuestionLevels)
      ? questProgressData.completedQuestionLevels
      : [];
    const questionStartTime = questProgressData.questionStartTime || currentCompletedAt;
    const durationDiffMs = currentCompletedAt - questStartTime;
    const durationMinutes = Math.round(durationDiffMs / 60000);
    const completionSeconds = Math.max(0, Math.floor((currentCompletedAt - questionStartTime) / 1000));
    const pointsValue = Number(points) || 10;
    const questionCompletionSeconds = Array.isArray(questProgressData.questionCompletionSeconds)
      ? [...questProgressData.questionCompletionSeconds]
      : [];
    questionCompletionSeconds[Math.max(parsedLevel - 1, 0)] = completionSeconds;

    const updatedProgress = {
      userId: String(userId),
      questId: String(questId),
      questName: String(questProgressData.questName || questData.name || ""),
      score: currentScore + pointsValue,
      totalScore: currentScore + pointsValue,
      currentQuestionLevel: parsedLevel,
      currentLevel: parsedLevel,
      questionCompletionSeconds,
      completedQuestionLevels: [
        ...completedQuestionLevels,
        {
          questionId: questionId || "",
          questionLevel: parsedLevel,
          completedAt: currentCompletedAt,
          points: pointsValue,
          completionSeconds,
        },
      ],
      questStartTime,
      questionStartTime: currentCompletedAt,
      questDurationMinutes: durationMinutes,
      lastActive: currentCompletedAt,
      updatedAt: currentCompletedAt,
    };

    await questProgressRef.set(updatedProgress, { merge: true });

    console.log("[updatePlayerProgress] saved", {
      docId: questProgressRef.id,
      questId,
      userId,
      currentQuestionLevel: updatedProgress.currentQuestionLevel,
      score: updatedProgress.score,
    });

    res.json({
      message: "Progress updated successfully",
      progress: updatedProgress,
    });
  } catch (error) {
    console.error("Error updating player progress:", error);
    res.status(500).json({ error: "Failed to update progress" });
  }
};

export const startQuestionTimer = async (req, res) => {
  try {
    const { userId, level, questId } = req.body || {};

    console.log("[startQuestionTimer] request", {
      userId,
      level,
      questId,
    });

    if (!userId || !level || !questId) {
      return res.status(400).json({ error: "userId, level and questId are required" });
    }

    // Get quest duration if questId is provided
    let questDurationMinutes = 60; // Default 60 minutes
    let questName = "";
    if (questId) {
      try {
        const questDoc = await db
          .collection(dbConfig.COLLECTIONS.QUESTS)
          .doc(String(questId))
          .get();
        if (questDoc.exists) {
          const questData = questDoc.data();
          questDurationMinutes = Number(questData.durationMinutes) || 60;
          questName = String(questData.name || "");
        }
      } catch (error) {
        console.error("Error fetching quest duration:", error);
      }
    }

    const questProgressRef = getQuestProgressDocRef(userId, questId);
    console.log("[startQuestionTimer] questProgress doc", {
      docId: questProgressRef.id,
      path: questProgressRef.path,
    });
    const questProgressSnap = await questProgressRef.get();
    const questProgressData = questProgressSnap.exists ? questProgressSnap.data() || {} : {};
    const now = new Date();

    if (questProgressData.questStartTime) {
      return res.json({
        message: "Question timer already initialized",
        startTime: questProgressData.questionStartTime || questProgressData.questStartTime,
        questDurationMinutes,
        questProgress: questProgressData,
      });
    }

    const questProgress = {
      userId: String(userId),
      questId: String(questId),
      questName: String(questProgressData.questName || questName || ""),
      questionStartTime: now,
      questStartTime: now,
      currentQuestionLevel: Number(level),
      currentLevel: Number(level),
      totalScore: Number(questProgressData.totalScore) || Number(questProgressData.score) || 0,
      questionCompletionSeconds: Array.isArray(questProgressData.questionCompletionSeconds)
        ? questProgressData.questionCompletionSeconds
        : [],
      questDurationMinutes,
      lastActive: now,
      updatedAt: now,
    };

    await questProgressRef.set(questProgress, { merge: true });

    console.log("[startQuestionTimer] saved", {
      docId: questProgressRef.id,
      questId,
      userId,
      questStartTime: questProgress.questStartTime,
      questDurationMinutes,
    });

    res.json({
      message: "Question timer started",
      startTime: now,
      questDurationMinutes,
      questProgress,
    });
  } catch (error) {
    console.error("Error starting question timer:", error);
    res.status(500).json({ error: "Failed to start timer" });
  }
};

export const getUserProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const { questId } = req.query || {};

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (questId) {
      const progressSnap = await getQuestProgressDocRef(userId, questId).get();
      if (!progressSnap.exists) {
        return res.json({ progress: null });
      }

      return res.json({
        progress: {
          id: progressSnap.id,
          ...progressSnap.data(),
        },
      });
    }

    const snapshot = await db
      .collection(dbConfig.COLLECTIONS.QUEST_PROGRESS)
      .where("userId", "==", String(userId))
      .get();

    const progresses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ progresses });
  } catch (error) {
    console.error("Error fetching user progress:", error);
    return res.status(500).json({ error: "Failed to get progress" });
  }
};

export const validateQuestAnswer = async (req, res) => {
  try {
    const { questId, questionId } = req.params;
    const { answer } = req.body || {};

    console.log("[validateQuestAnswer] request", {
      questId,
      questionId,
      answer,
    });

    if (!questId || !questionId) {
      return res.status(400).json({ error: "questId and questionId are required" });
    }

    const normalizedInput = normalizeAnswer(answer);
    if (!normalizedInput) {
      return res.status(400).json({ error: "Answer is required" });
    }

    const questionDoc = await db
      .collection(dbConfig.COLLECTIONS.QUESTIONS)
      .doc(String(questionId))
      .get();

    if (!questionDoc.exists) {
      return res.status(404).json({ error: "Question not found" });
    }

    const question = questionDoc.data() || {};
    if (String(question.questId || "") !== String(questId)) {
      return res.status(400).json({ error: "Question does not belong to selected quest" });
    }

    const normalizedCorrect = normalizeAnswer(question.correctAnswer);
    const isCorrect = normalizedInput === normalizedCorrect;

    console.log("[validateQuestAnswer] result", {
      questId,
      questionId,
      normalizedInput,
      normalizedCorrect,
      isCorrect,
    });

    return res.json({
      isCorrect,
      message: isCorrect ? "Correct answer" : "Incorrect answer",
      question: {
        id: questionDoc.id,
        level: Number(question.level) || null,
        title: question.title || "",
      },
    });
  } catch (error) {
    console.error("Error validating quest answer:", error);
    return res.status(500).json({ error: "Failed to validate answer" });
  }
};
