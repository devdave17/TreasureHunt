import { db, dbConfig } from "../backend/database/dbConfig.js";
import {
  normalizeQuestSchedule,
  getQuestStartAtMs,
} from "../utils/questTiming.js";
import process from "node:process";
import dotenv from "dotenv";

dotenv.config();

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

const toCanonicalAnswer = (value) =>
  normalizeAnswer(value)
    .replace(/[\-_]+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isNumericAnswer = (value) => {
  const normalized = normalizeAnswer(value);
  if (!normalized) {
    return false;
  }

  return /^[-+]?\d+(\.\d+)?$/.test(normalized);
};

const answersMatch = (inputAnswer, expectedAnswer, mode = "flexible") => {
  const normalizedInput = normalizeAnswer(inputAnswer);
  const normalizedExpected = normalizeAnswer(expectedAnswer);

  if (!normalizedInput || !normalizedExpected) {
    return false;
  }

  if (mode === "strict") {
    return normalizedInput === normalizedExpected;
  }

  if (isNumericAnswer(normalizedInput) && isNumericAnswer(normalizedExpected)) {
    return Number(normalizedInput) === Number(normalizedExpected);
  }

  return toCanonicalAnswer(normalizedInput) === toCanonicalAnswer(normalizedExpected);
};

const buildQuestProgressId = (userId, questId) =>
  `${String(userId || "").trim()}_${String(questId || "").trim()}`;

const getQuestProgressDocRef = (userId, questId) => {
  const progressId = buildQuestProgressId(userId, questId);
  return db.collection(dbConfig.COLLECTIONS.QUEST_PROGRESS).doc(progressId);
};

const questDistributionTimers = new Map();

const computeQuestLevelDistribution = async (questId) => {
  const normalizedQuestId = String(questId || "").trim();
  if (!normalizedQuestId) {
    return {
      questId: normalizedQuestId,
      totalQuestions: 0,
      counts: [],
      activeParticipants: 0,
      updatedAt: new Date(),
    };
  }

  const questionSnapshot = await db
    .collection(dbConfig.COLLECTIONS.QUESTIONS)
    .where("questId", "==", normalizedQuestId)
    .get();

  const totalQuestions = questionSnapshot.size;
  const levelSet = new Set();
  questionSnapshot.docs.forEach((doc, index) => {
    const question = doc.data() || {};
    const level = Number(question.level) || index + 1;
    if (level > 0) {
      levelSet.add(level);
    }
  });

  const progressSnapshot = await db
    .collection(dbConfig.COLLECTIONS.QUEST_PROGRESS)
    .where("questId", "==", normalizedQuestId)
    .get();

  const activeProgressRows = progressSnapshot.docs
    .map((doc) => doc.data() || {})
    .filter((progress) => !Boolean(progress.isSubmitted));

  const countsMap = new Map();
  activeProgressRows.forEach((progress) => {
    const completedLevels = Array.isArray(progress.completedQuestionLevels)
      ? progress.completedQuestionLevels
      : [];

    const uniqueCompleted = new Set(
      completedLevels
        .map((entry) => {
          const level = Number(entry?.questionLevel || entry?.level || 0);
          return Number.isFinite(level) ? level : 0;
        })
        .filter((level) => level > 0),
    );

    // Count players on the level they are currently solving.
    // If level N is submitted, player is now solving N+1.
    const completedCount = uniqueCompleted.size;
    const activeLevel = Math.max(1, completedCount + 1);
    const bucketLevel = totalQuestions > 0
      ? Math.min(activeLevel, totalQuestions)
      : activeLevel;
    countsMap.set(bucketLevel, (countsMap.get(bucketLevel) || 0) + 1);
    levelSet.add(bucketLevel);
  });

  if (totalQuestions > 0) {
    for (let level = 1; level <= totalQuestions; level += 1) {
      levelSet.add(level);
    }
  }

  const sortedLevels = [...levelSet].sort((a, b) => a - b);
  const counts = sortedLevels.map((level) => ({
    level,
    players: countsMap.get(level) || 0,
  }));

  return {
    questId: normalizedQuestId,
    totalQuestions,
    activeParticipants: activeProgressRows.length,
    counts,
    updatedAt: new Date(),
  };
};

const scheduleQuestDistributionBroadcast = (io, questId) => {
  if (!io || !questId) {
    return;
  }

  const normalizedQuestId = String(questId);
  if (questDistributionTimers.has(normalizedQuestId)) {
    return;
  }

  const timer = setTimeout(async () => {
    questDistributionTimers.delete(normalizedQuestId);

    try {
      const distribution = await computeQuestLevelDistribution(normalizedQuestId);
      io.emit("quest-level-distribution", distribution);
    } catch (error) {
      console.error("Error broadcasting quest level distribution:", error);
    }
  }, 1200);

  questDistributionTimers.set(normalizedQuestId, timer);
};

const ensurePlayerAllowed = async (userId) => {
  const userDoc = await db
    .collection(dbConfig.COLLECTIONS.USERS)
    .doc(String(userId))
    .get();

  if (!userDoc.exists) {
    return {
      allowed: false,
      status: 404,
      payload: { error: "Player not found" },
    };
  }

  const userData = userDoc.data() || {};
  if (Boolean(userData.isBlocked)) {
    return {
      allowed: false,
      status: 403,
      payload: {
        error: "Blocked by invigilator due to UMF.",
        code: "PLAYER_BLOCKED_UMF",
      },
    };
  }

  return { allowed: true, userData };
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

export const getQuestLevelDistribution = async (req, res) => {
  try {
    const { questId } = req.params || {};
    if (!questId) {
      return res.status(400).json({ error: "questId is required" });
    }

    const distribution = await computeQuestLevelDistribution(questId);
    return res.json(distribution);
  } catch (error) {
    console.error("Error fetching quest level distribution:", error);
    return res.status(500).json({ error: "Failed to fetch quest level distribution" });
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

    const eligibility = await ensurePlayerAllowed(userId);
    if (!eligibility.allowed) {
      return res.status(eligibility.status).json(eligibility.payload);
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

    const normalizedCompletedLevels = completedQuestionLevels
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        ...entry,
        questionLevel: Number(entry.questionLevel || entry.level || 0) || 0,
        points: Number(entry.points) || 0,
      }));

    const existingEntryIndex = normalizedCompletedLevels.findIndex((entry) => {
      if (questionId && entry.questionId) {
        return String(entry.questionId) === String(questionId);
      }

      return Number(entry.questionLevel) === parsedLevel;
    });

    const nextCompletedQuestionLevels =
      existingEntryIndex >= 0
        ? normalizedCompletedLevels.map((entry, index) =>
            index === existingEntryIndex
              ? {
                  questionId: questionId || entry.questionId || "",
                  questionLevel: parsedLevel,
                  completedAt: currentCompletedAt,
                  points: pointsValue,
                  completionSeconds,
                }
              : entry,
          )
        : [
            ...normalizedCompletedLevels,
            {
              questionId: questionId || "",
              questionLevel: parsedLevel,
              completedAt: currentCompletedAt,
              points: pointsValue,
              completionSeconds,
            },
          ];

    const totalScore = nextCompletedQuestionLevels.reduce(
      (accumulator, entry) => accumulator + (Number(entry.points) || 0),
      0,
    );

    const updatedProgress = {
      userId: String(userId),
      questId: String(questId),
      questName: String(questProgressData.questName || questData.name || ""),
      score: totalScore,
      totalScore: totalScore,
      currentQuestionLevel: parsedLevel,
      currentLevel: parsedLevel,
      questionCompletionSeconds,
      completedQuestionLevels: nextCompletedQuestionLevels,
      questStartTime,
      questionStartTime: currentCompletedAt,
      questDurationMinutes: durationMinutes,
      lastActive: currentCompletedAt,
      updatedAt: currentCompletedAt,
    };

    await questProgressRef.set(updatedProgress, { merge: true });
    scheduleQuestDistributionBroadcast(req.io, questId);

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

    const eligibility = await ensurePlayerAllowed(userId);
    if (!eligibility.allowed) {
      return res.status(eligibility.status).json(eligibility.payload);
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
    const now = new Date();

    const questProgress = {
      userId: String(userId),
      questId: String(questId),
      questName: String(questName || ""),
      questionStartTime: now,
      questStartTime: now,
      currentQuestionLevel: Number(level),
      currentLevel: Number(level),
      totalScore: 0,
      score: 0,
      completedQuestionLevels: [],
      questionCompletionSeconds: [],
      questDurationMinutes,
      lastActive: now,
      updatedAt: now,
    };

    // Starting a quest should always create a fresh attempt for that quest.
    await questProgressRef.set(questProgress);
    scheduleQuestDistributionBroadcast(req.io, questId);

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

export const finalizeQuestAttempt = async (req, res) => {
  try {
    const { questId } = req.params || {};
    const {
      userId,
      reason = "manual",
      solvedCount,
      totalQuestions,
      currentLevel,
    } = req.body || {};

    if (!questId || !userId) {
      return res.status(400).json({ error: "questId and userId are required" });
    }

    const eligibility = await ensurePlayerAllowed(userId);
    if (!eligibility.allowed) {
      return res.status(eligibility.status).json(eligibility.payload);
    }

    const questProgressRef = getQuestProgressDocRef(userId, questId);
    const questProgressSnap = await questProgressRef.get();
    const existingProgress = questProgressSnap.exists ? questProgressSnap.data() || {} : {};
    const now = new Date();
    const questStartMs = normalizeTimestampLike(existingProgress.questStartTime);
    const finalElapsedSeconds = Number.isFinite(questStartMs)
      ? Math.max(0, Math.floor((now.getTime() - questStartMs) / 1000))
      : null;

    const questionStartMs = normalizeTimestampLike(existingProgress.questionStartTime);
    const currentLevelNumber = Number(currentLevel) || Number(existingProgress.currentLevel) || 0;
    const runningQuestionSeconds = Number.isFinite(questionStartMs)
      ? Math.max(0, Math.floor((now.getTime() - questionStartMs) / 1000))
      : null;

    const questionCompletionSeconds = Array.isArray(existingProgress.questionCompletionSeconds)
      ? [...existingProgress.questionCompletionSeconds]
      : [];

    if (
      Number.isFinite(currentLevelNumber) &&
      currentLevelNumber > 0 &&
      Number.isFinite(runningQuestionSeconds)
    ) {
      const index = Math.max(currentLevelNumber - 1, 0);
      const existingSeconds = Number(questionCompletionSeconds[index]) || 0;
      questionCompletionSeconds[index] = Math.max(existingSeconds, runningQuestionSeconds);
    }

    const updatedProgress = {
      userId: String(userId),
      questId: String(questId),
      submittedAt: now,
      isSubmitted: true,
      submissionReason: String(reason || "manual"),
      status:
        String(reason || "manual").toLowerCase() === "timeout"
          ? "auto_submitted_timeout"
          : "submitted",
      finalElapsedSeconds,
      questionCompletionSeconds,
      lastActive: now,
      updatedAt: now,
    };

    if (Number.isFinite(Number(solvedCount))) {
      updatedProgress.solvedCount = Number(solvedCount);
    }

    if (Number.isFinite(Number(totalQuestions))) {
      updatedProgress.totalQuestions = Number(totalQuestions);
    }

    await questProgressRef.set(updatedProgress, { merge: true });
    scheduleQuestDistributionBroadcast(req.io, questId);

    return res.json({
      message: "Quest attempt finalized",
      questId: String(questId),
      userId: String(userId),
      finalizedAt: now,
      finalElapsedSeconds,
      status: updatedProgress.status,
    });
  } catch (error) {
    console.error("Error finalizing quest attempt:", error);
    return res.status(500).json({ error: "Failed to finalize quest attempt" });
  }
};

export const validateQuestAnswer = async (req, res) => {
  try {
    const { questId, questionId } = req.params;
    const { answer, userId } = req.body || {};

    console.log("[validateQuestAnswer] request", {
      questId,
      questionId,
      answer,
    });

    if (!questId || !questionId) {
      return res.status(400).json({ error: "questId and questionId are required" });
    }

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const eligibility = await ensurePlayerAllowed(userId);
    if (!eligibility.allowed) {
      return res.status(eligibility.status).json(eligibility.payload);
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

    const validationMode = ["strict", "flexible"].includes(String(question.answerValidationMode || "").toLowerCase())
      ? String(question.answerValidationMode).toLowerCase()
      : "flexible";

    const expectedAnswers = [
      question.correctAnswer,
      ...(Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : []),
    ]
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);

    const isCorrect = expectedAnswers.some((expected) =>
      answersMatch(normalizedInput, expected, validationMode),
    );

    console.log("[validateQuestAnswer] result", {
      questId,
      questionId,
      normalizedInput,
      validationMode,
      expectedAnswersCount: expectedAnswers.length,
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
