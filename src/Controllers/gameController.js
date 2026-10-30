import { db, dbConfig } from "../backend/database/dbConfig.js";
import {
  normalizeQuestSchedule,
  getQuestStartAtMs,
  getQuestEndAtMs,
} from "../utils/questTiming.js";
import process from "node:process";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

const isInstituteEmail = (email) =>
  /^[^\s@]+@iiitvadodara\.ac\.in$/.test(email);

const getPlayerToken = (playerId) => {
  const playerJwtSecret =
    process.env.PLAYER_JWT_SECRET || process.env.PLAYER_MASTER_PASSWORD || "";

  if (!playerJwtSecret) {
    return null;
  }

  return jwt.sign(
    {
      type: "player",
      role: "player",
    },
    playerJwtSecret,
    {
      subject: String(playerId),
      expiresIn: "6h",
    },
  );
};

const serializePlayer = (playerId, player, email) => ({
  id: String(playerId),
  email: player.email || email,
  name: player.name || "",
  score: Number(player.score) || 0,
  wrongAttempt: Number(player.wrongAttempt) || 0,
  currentLevel: Number(player.currentLevel) || 1,
  completedLevels: Array.isArray(player.completedLevels)
    ? player.completedLevels
    : [],
  isBlocked: Boolean(player.isBlocked),
});

const normalizeHackerRankScore = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed * 100) / 100;
};

const calculateWeightedTotalScore = (mapScore, hackerRankScore) => {
  const weighted = (Number(mapScore) || 0) * 0.2 + (Number(hackerRankScore) || 0) * 0.8;
  return Math.round(weighted * 100) / 100;
};

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
    .replace(/[-_]+/g, " ")
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

const ensureQuestProgressWrongAttemptLevel = async (
  userId,
  questId,
  level,
  increment = false,
  wrongAnswer = null,
) => {
  const normalizedUserId = String(userId || "").trim();
  const normalizedQuestId = String(questId || "").trim();
  const normalizedLevel = Number(level);
  const progressId = buildQuestProgressId(normalizedUserId, normalizedQuestId);
  const mongoDb = await db.ensureReady();
  const collection = mongoDb.collection(dbConfig.COLLECTIONS.QUEST_PROGRESS);
  const attempts = {
    $cond: [{ $isArray: "$wrongAttempts" }, "$wrongAttempts", []],
  };
  const matchingLevel = {
    $eq: [
      {
        $convert: {
          input: "$$entry.level",
          to: "int",
          onError: 0,
          onNull: 0,
        },
      },
      normalizedLevel,
    ],
  };
  const normalizedAttempts = {
    $reduce: {
      input: attempts,
      initialValue: [],
      in: {
        $let: {
          vars: {
            entryLevel: {
              $convert: {
                input: "$$this.level",
                to: "int",
                onError: 0,
                onNull: 0,
              },
            },
            entryCount: {
              $convert: {
                input: {
                  $ifNull: ["$$this.wrongCount", "$$this.count"],
                },
                to: "int",
                onError: 0,
                onNull: 0,
              },
            },
            entryWrongAnswers: {
              $cond: [
                {
                  $isArray: {
                    $ifNull: ["$$this.wrongAnswers", "$$this.WrongAnswers"],
                  },
                },
                {
                  $ifNull: ["$$this.wrongAnswers", "$$this.WrongAnswers"],
                },
                [],
              ],
            },
          },
          in: {
            $cond: [
              { $gt: ["$$entryLevel", 0] },
              {
                $cond: [
                  {
                    $in: [
                      "$$entryLevel",
                      {
                        $map: {
                          input: "$$value",
                          as: "entry",
                          in: "$$entry.level",
                        },
                      },
                    ],
                  },
                  {
                    $map: {
                      input: "$$value",
                      as: "entry",
                      in: {
                        $cond: [
                          { $eq: ["$$entry.level", "$$entryLevel"] },
                          {
                            level: "$$entryLevel",
                            wrongCount: {
                              $add: ["$$entry.wrongCount", "$$entryCount"],
                            },
                            wrongAnswers: {
                              $concatArrays: [
                                "$$entry.wrongAnswers",
                                "$$entryWrongAnswers",
                              ],
                            },
                          },
                          "$$entry",
                        ],
                      },
                    },
                  },
                  {
                    $concatArrays: [
                      "$$value",
                      [
                        {
                          level: "$$entryLevel",
                          wrongCount: "$$entryCount",
                          wrongAnswers: "$$entryWrongAnswers",
                        },
                      ],
                    ],
                  },
                ],
              },
              "$$value",
            ],
          },
        },
      },
    },
  };

  const updatedProgress = await collection.findOneAndUpdate(
    { _id: progressId },
    [
      {
        $set: {
          wrongAttempts: {
            $let: {
              vars: { normalized: normalizedAttempts },
              in: {
                $let: {
                  vars: {
                    existing: {
                      $filter: {
                        input: "$$normalized",
                        as: "entry",
                        cond: matchingLevel,
                      },
                    },
                    otherLevels: {
                      $filter: {
                        input: "$$normalized",
                        as: "entry",
                        cond: { $not: [matchingLevel] },
                      },
                    },
                  },
                  in: {
                    $concatArrays: [
                      "$$otherLevels",
                      [
                        {
                          level: normalizedLevel,
                          wrongCount: {
                            $add: [
                              {
                                $sum: {
                                  $map: {
                                    input: "$$existing",
                                    as: "entry",
                                    in: "$$entry.wrongCount",
                                  },
                                },
                              },
                              increment ? 1 : 0,
                            ],
                          },
                          wrongAnswers: {
                            $concatArrays: [
                              {
                                $reduce: {
                                  input: "$$existing",
                                  initialValue: [],
                                  in: {
                                    $concatArrays: [
                                      "$$value",
                                      "$$this.wrongAnswers",
                                    ],
                                  },
                                },
                              },
                              typeof wrongAnswer === "string"
                                ? [{ $literal: wrongAnswer }]
                                : [],
                            ],
                          },
                        },
                      ],
                    ],
                  },
                },
              },
            },
          },
          userId: normalizedUserId,
          questId: normalizedQuestId,
          updatedAt: new Date(),
        },
      },
    ],
    {
      upsert: true,
      returnDocument: "after",
      projection: { wrongAttempts: 1 },
    },
  );

  return Array.isArray(updatedProgress?.wrongAttempts)
    ? updatedProgress.wrongAttempts
    : [];
};

const getQuestRoomName = (questId) => `quest:${String(questId || "").trim()}`;

const getQuestExpiryPayload = (questData, nowMs = Date.now()) => {
  const contestEndAtMs = getQuestEndAtMs(questData);
  return {
    code: "QUEST_EXPIRED",
    error: "This quest has already ended",
    serverNowMs: nowMs,
    contestEndAtMs,
  };
};

const questDistributionTimers = new Map();
const questRankingCache = new Map();
const publicQuestsCache = {
  payload: null,
  expiresAt: 0,
};
const publicQuestQuestionsCache = new Map();

export const invalidateQuestContentCache = (questId) => {
  publicQuestsCache.payload = null;
  publicQuestsCache.expiresAt = 0;

  const normalizedQuestId = String(questId || "").trim();
  if (normalizedQuestId) {
    publicQuestQuestionsCache.delete(normalizedQuestId);
  }
};

export const invalidateQuestRankingCache = (questId) => {
  const normalizedQuestId = String(questId || "").trim();
  if (!normalizedQuestId) {
    return;
  }

  questRankingCache.delete(normalizedQuestId);
};

const getCachedPublicQuests = () => {
  if (!publicQuestsCache.payload || publicQuestsCache.expiresAt <= Date.now()) {
    publicQuestsCache.payload = null;
    publicQuestsCache.expiresAt = 0;
    return null;
  }

  return publicQuestsCache.payload;
};

const setCachedPublicQuests = (payload) => {
  publicQuestsCache.payload = payload;
  publicQuestsCache.expiresAt = Date.now() + 300000;
};

const getCachedPublicQuestQuestions = (questId) => {
  const normalizedQuestId = String(questId || "").trim();
  if (!normalizedQuestId) {
    return null;
  }

  const cachedEntry = publicQuestQuestionsCache.get(normalizedQuestId);
  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    publicQuestQuestionsCache.delete(normalizedQuestId);
    return null;
  }

  return cachedEntry.payload;
};

const setCachedPublicQuestQuestions = (questId, payload) => {
  const normalizedQuestId = String(questId || "").trim();
  if (!normalizedQuestId) {
    return;
  }

  publicQuestQuestionsCache.set(normalizedQuestId, {
    payload,
    expiresAt: Date.now() + 300000,
  });
};

const getCachedQuestRanking = (questId) => {
  const normalizedQuestId = String(questId || "").trim();
  if (!normalizedQuestId) {
    return null;
  }

  const cachedEntry = questRankingCache.get(normalizedQuestId);
  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    questRankingCache.delete(normalizedQuestId);
    return null;
  }

  return cachedEntry.payload;
};

const setCachedQuestRanking = (questId, payload) => {
  const normalizedQuestId = String(questId || "").trim();
  if (!normalizedQuestId) {
    return;
  }

  questRankingCache.set(normalizedQuestId, {
    payload,
    expiresAt: Date.now() + 5000,
  });
};

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
    .filter((progress) => {
      const status = String(progress.status || "").toLowerCase();
      return (
        !progress.isSubmitted &&
        !["submitted", "completed", "timeout", "blocked", "abandoned"].includes(status)
      );
    });

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

    const completedCount = uniqueCompleted.size;
    const storedActiveLevel =
      Number(progress.currentLevel) || Number(progress.currentQuestionLevel) || 0;
    const activeLevel = Math.max(
      1,
      completedCount > 0 ? completedCount + 1 : storedActiveLevel || 1,
    );
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

export const scheduleQuestDistributionBroadcast = (io, questId) => {
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
      io.to(getQuestRoomName(normalizedQuestId)).emit("quest-level-distribution", distribution);
    } catch (error) {
      console.error("Error broadcasting quest level distribution:", error);
    }
  }, 1200);

  questDistributionTimers.set(normalizedQuestId, timer);
};

export const setQuestProgressPresence = async (
  io,
  userId,
  questId,
  status,
  presenceId = "",
) => {
  const normalizedUserId = String(userId || "").trim();
  const normalizedQuestId = String(questId || "").trim();
  if (!normalizedUserId || !normalizedQuestId) {
    return;
  }

  const progressRef = getQuestProgressDocRef(
    normalizedUserId,
    normalizedQuestId,
  );
  const progressSnapshot = await progressRef.get();
  if (!progressSnapshot.exists) {
    return;
  }

  const progress = progressSnapshot.data() || {};
  if (progress.isSubmitted || progress.status === "submitted") {
    return;
  }
  if (
    status === "abandoned" &&
    presenceId &&
    progress.presenceSocketId &&
    progress.presenceSocketId !== presenceId
  ) {
    return;
  }

  const now = new Date();
  const isSameActivePresence =
    status === "active" &&
    progress.status === "active" &&
    presenceId &&
    progress.presenceSocketId === presenceId;
  const sessionStartedAtMs = normalizeTimestampLike(progress.currentSessionStartedAt);
  const sessionSeconds = status === "abandoned" && Number.isFinite(sessionStartedAtMs)
    ? Math.max(0, Math.floor((now.getTime() - sessionStartedAtMs) / 1000))
    : 0;
  const totalActiveSeconds = Math.max(
    0,
    getStoredActiveSeconds(progress),
  ) + sessionSeconds;

  await progressRef.set(
    {
      status,
      presenceSocketId: status === "active" ? presenceId : null,
      totalActiveSeconds,
      currentSessionStartedAt:
        status === "active"
          ? isSameActivePresence
            ? progress.currentSessionStartedAt
            : now
          : null,
      lastSessionEndedAt: status === "active" ? progress.lastSessionEndedAt || null : now,
      lastActive: now,
      updatedAt: now,
    },
    { merge: true },
  );
  invalidateQuestRankingCache(normalizedQuestId);
  scheduleQuestDistributionBroadcast(io, normalizedQuestId);
};

export const closeQuestSession = async (
  io,
  userId,
  questId,
  status = "abandoned",
  presenceId = "",
) => {
  const normalizedUserId = String(userId || "").trim();
  const normalizedQuestId = String(questId || "").trim();
  if (!normalizedUserId || !normalizedQuestId) {
    return null;
  }

  const progressRef = getQuestProgressDocRef(normalizedUserId, normalizedQuestId);
  const progressSnapshot = await progressRef.get();
  if (!progressSnapshot.exists) {
    return null;
  }

  const progress = progressSnapshot.data() || {};
  if (progress.isSubmitted || progress.status === "submitted") {
    return progress;
  }
  if (
    presenceId &&
    progress.presenceSocketId &&
    progress.presenceSocketId !== presenceId
  ) {
    return progress;
  }

  const now = new Date();
  const sessionStartedAtMs = normalizeTimestampLike(progress.currentSessionStartedAt);
  const sessionSeconds = Number.isFinite(sessionStartedAtMs)
    ? Math.max(0, Math.floor((now.getTime() - sessionStartedAtMs) / 1000))
    : 0;
  const updatedProgress = {
    status,
    presenceSocketId: null,
    totalActiveSeconds:
      getStoredActiveSeconds(progress) + sessionSeconds,
    currentSessionStartedAt: null,
    lastSessionEndedAt: now,
    lastActive: now,
    updatedAt: now,
  };

  const closed = await progressRef.updateIf(
    {
      status: progress.status || "active",
      currentSessionStartedAt: progress.currentSessionStartedAt || null,
    },
    updatedProgress,
  );
  if (!closed) {
    const latestSnapshot = await progressRef.get();
    return latestSnapshot.exists ? latestSnapshot.data() : null;
  }
  invalidateQuestRankingCache(normalizedQuestId);
  scheduleQuestDistributionBroadcast(io, normalizedQuestId);
  return { ...progress, ...updatedProgress };
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
  if (userData.isBlocked) {
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
  const storedActiveSeconds = Number(progress.totalActiveSeconds);
  const sessionStartedMs = normalizeTimestampLike(progress.currentSessionStartedAt);
  if (Number.isFinite(storedActiveSeconds) || progress.currentSessionStartedAt) {
    const runningSeconds = Number.isFinite(sessionStartedMs)
      ? Math.max(0, Math.floor((Date.now() - sessionStartedMs) / 1000))
      : 0;
    return Math.max(0, storedActiveSeconds || 0) + runningSeconds;
  }

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

const getStoredActiveSeconds = (progress = {}) => {
  const storedSeconds = Number(progress.totalActiveSeconds);
  const finalSeconds = Number(progress.finalElapsedSeconds);
  const validStoredSeconds = Number.isFinite(storedSeconds) && storedSeconds >= 0
    ? storedSeconds
    : 0;
  const validFinalSeconds = Number.isFinite(finalSeconds) && finalSeconds >= 0
    ? finalSeconds
    : 0;

  if (validStoredSeconds > 0 || validFinalSeconds > 0) {
    return Math.max(validStoredSeconds, validFinalSeconds);
  }

  const startMs = normalizeTimestampLike(progress.attemptStartedAt || progress.questStartTime);
  const endMs = normalizeTimestampLike(progress.lastSessionEndedAt || progress.lastActive);
  if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
    return Math.floor((endMs - startMs) / 1000);
  }

  return 0;
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

    if (!isInstituteEmail(normalizedEmail)) {
      return res
        .status(400)
        .json({ error: "Use your @iiitvadodara.ac.in email address." });
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
      return res.json({
        message: "Name required to create account",
        requiresName: true,
        email: normalizedEmail,
      });
    }

    const player = snapshot.docs[0].data() || {};
    const playerId = String(snapshot.docs[0].id);
    const users = (await db.ensureReady()).collection(dbConfig.COLLECTIONS.USERS);
    await users.updateOne(
      {
        _id: playerId,
        $or: [{ wrongAttempt: { $exists: false } }, { wrongAttempt: null }],
      },
      { $set: { wrongAttempt: 0 } },
    );
    const currentPlayer = await users.findOne(
      { _id: playerId },
      { projection: { wrongAttempt: 1 } },
    );
    player.wrongAttempt = Number(currentPlayer?.wrongAttempt) || 0;

    if (player.isBlocked) {
      return res
        .status(403)
        .json({ error: "Your account is blocked. Contact admin." });
    }

    const token = getPlayerToken(snapshot.docs[0].id);
    if (!token) {
      return res
        .status(503)
        .json({ error: "Server misconfigured. Set PLAYER_JWT_SECRET." });
    }

    res.json({
      message: "Login successful",
      token,
      player: {
        id: playerId,
        email: player.email || normalizedEmail,
        name: player.name || "",
        score: Number(player.score) || 0,
        wrongAttempt: Number(player.wrongAttempt) || 0,
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

export const registerPlayer = async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = String(name || "").trim();
    const masterPassword = String(
      process.env.PLAYER_MASTER_PASSWORD || "",
    ).trim();

    if (!normalizedEmail || !password || !normalizedName) {
      return res
        .status(400)
        .json({ error: "email, password and name are required" });
    }

    if (!isInstituteEmail(normalizedEmail)) {
      return res
        .status(400)
        .json({ error: "Use your @iiitvadodara.ac.in email address." });
    }

    if (!masterPassword) {
      return res
        .status(503)
        .json({ error: "Server misconfigured. Set PLAYER_MASTER_PASSWORD." });
    }

    if (String(password).trim() !== masterPassword) {
      return res.status(401).json({ error: "Invalid password." });
    }

    if (
      !process.env.PLAYER_JWT_SECRET &&
      !process.env.PLAYER_MASTER_PASSWORD
    ) {
      return res
        .status(503)
        .json({ error: "Server misconfigured. Set PLAYER_JWT_SECRET." });
    }

    const users = db.collection(dbConfig.COLLECTIONS.USERS);
    const existingUser = await users
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      return res.status(409).json({ error: "This email is already registered." });
    }

    const player = {
      email: normalizedEmail,
      name: normalizedName,
      currentLevel: 1,
      isBlocked: false,
      score: 0,
      completedLevels: [],
      wrongAttempt: 0,
      createdAt: new Date(),
      lastActive: new Date(),
    };
    const docRef = await users.add(player);
    const token = getPlayerToken(docRef.id);

    if (!token) {
      return res
        .status(503)
        .json({ error: "Server misconfigured. Set PLAYER_JWT_SECRET." });
    }

    return res.status(201).json({
      message: "Account created successfully",
      token,
      player: serializePlayer(docRef.id, player, normalizedEmail),
    });
  } catch (error) {
    console.error("Error registering player:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
};

export const getPublicQuests = async (req, res) => {
  try {
    const cachedQuests = getCachedPublicQuests();
    if (cachedQuests) {
      return res.json(cachedQuests);
    }

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

    setCachedPublicQuests(quests);

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

    const cachedQuestQuestions = getCachedPublicQuestQuestions(questId);
    if (cachedQuestQuestions) {
      return res.json(cachedQuestQuestions);
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
      inputKey: question.inputKey || "",
      problemStatement: question.problemStatement || "",
      difficulty: question.difficulty || "Medium",
      score: Number(question.score) || 10,
      level: Number(question.level) || index + 1,
      order: index + 1,
    }));

    const responsePayload = {
      quest: {
        id: questDoc.id,
        name: questDoc.data()?.name || "Untitled Quest",
        code: questDoc.data()?.code || "",
        ...normalizeQuestSchedule(questDoc.data() || {}),
        startAtMs: getQuestStartAtMs(questDoc.data() || {}),
      },
      questions,
    };

    setCachedPublicQuestQuestions(questId, responsePayload);
    res.json(responsePayload);
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

    const cachedRanking = getCachedQuestRanking(questId);
    if (cachedRanking) {
      return res.json(cachedRanking);
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
        const mapScore = Number(progress.totalScore) || Number(progress.score) || 0;
        const hackerRankScore = normalizeHackerRankScore(progress.HackerRank_score);
        const totalScore = calculateWeightedTotalScore(mapScore, hackerRankScore);
        const elapsedSeconds = getQuestElapsedSeconds(progress);
        const userData = userMap.get(String(progress.userId || "").trim()) || {};
        const questionCompletionSeconds =
          progress.questionCompletionSeconds && typeof progress.questionCompletionSeconds === "object"
            ? progress.questionCompletionSeconds
            : {};
        return {
          userId: String(progress.userId || ""),
          name: String(userData.name || progress.playerName || "Unknown player"),
          email: String(userData.email || progress.playerEmail || ""),
          progressId: progress.id,
          mapScore,
          hackerRankScore,
          totalCombinedScore: mapScore + hackerRankScore,
          totalScore,
          solvedQuestions: normalizedCompletedLevels.length,
          totalCompletionSeconds: elapsedSeconds,
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

        if (b.hackerRankScore !== a.hackerRankScore) {
          return b.hackerRankScore - a.hackerRankScore;
        }

        return String(a.userId || "").localeCompare(String(b.userId || ""));
      })
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));

    const questionSnapshot = await db
      .collection(dbConfig.COLLECTIONS.QUESTIONS)
      .where("questId", "==", String(questId))
      .get();

    const responsePayload = {
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
    };

    setCachedQuestRanking(questId, responsePayload);
    res.json(responsePayload);
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
    const { questId, questionId, level, points } = req.body || {};
    const userId = String(req.playerId || "");

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
    if (!questDoc.exists) {
      return res.status(404).json({ error: "Quest not found" });
    }
    const questData = questDoc.exists ? questDoc.data() || {} : {};
    const questEndAtMs = getQuestEndAtMs(questData);
    const serverNowMs = Date.now();
    if (serverNowMs >= questEndAtMs) {
      return res.status(409).json(getQuestExpiryPayload(questData, serverNowMs));
    }

    const questProgressRef = getQuestProgressDocRef(userId, questId);
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
      HackerRank_score: normalizeHackerRankScore(questProgressData.HackerRank_score),
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

    const finalServerNowMs = Date.now();
    if (finalServerNowMs >= questEndAtMs) {
      return res
        .status(409)
        .json(getQuestExpiryPayload(questData, finalServerNowMs));
    }

    await questProgressRef.set(updatedProgress, { merge: true });
    invalidateQuestRankingCache(questId);
    scheduleQuestDistributionBroadcast(req.io, questId);

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
    const { level, questId } = req.body || {};
    const userId = String(req.playerId || "");

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
    let questData = {};
    if (questId) {
      try {
        const questDoc = await db
          .collection(dbConfig.COLLECTIONS.QUESTS)
          .doc(String(questId))
          .get();
        if (questDoc.exists) {
          questData = questDoc.data() || {};
          questDurationMinutes = Number(questData.durationMinutes) || 60;
          questName = String(questData.name || "");
        }
      } catch (error) {
        console.error("Error fetching quest duration:", error);
      }
    }

    const questProgressRef = getQuestProgressDocRef(userId, questId);
    const now = new Date();
    const questStartAtMs = getQuestStartAtMs({
      startAtMs: questData?.startAtMs,
      startAt: questData?.startAt,
    });
    const timerEndAtMs = getQuestEndAtMs({
      startAtMs: questStartAtMs,
      durationMinutes: questDurationMinutes,
    });

    if (now.getTime() >= timerEndAtMs) {
      return res.status(409).json({ error: "This quest has already ended" });
    }

    const existingProgressSnapshot = await questProgressRef.get();
    const existingProgress = existingProgressSnapshot.exists
      ? existingProgressSnapshot.data() || {}
      : {};
    const isResuming = Boolean(existingProgressSnapshot.exists);
    const questProgress = {
      userId: String(userId),
      questId: String(questId),
      questName: String(questName || ""),
      questionStartTime: now,
      questStartTime: new Date(questStartAtMs),
      attemptStartedAt: existingProgress.attemptStartedAt || now,
      timerEndAtMs,
      currentQuestionLevel: Number(level),
      currentLevel: Number(level),
      status: "active",
      HackerRank_score: normalizeHackerRankScore(existingProgress.HackerRank_score),
      totalScore: Number(existingProgress.totalScore) || Number(existingProgress.score) || 0,
      score: Number(existingProgress.score) || Number(existingProgress.totalScore) || 0,
      completedQuestionLevels: Array.isArray(existingProgress.completedQuestionLevels)
        ? existingProgress.completedQuestionLevels
        : [],
      questionCompletionSeconds: Array.isArray(existingProgress.questionCompletionSeconds)
        ? existingProgress.questionCompletionSeconds
        : [],
      questDurationMinutes,
      totalActiveSeconds: getStoredActiveSeconds(existingProgress),
      currentSessionStartedAt: now,
      lastSessionEndedAt: existingProgress.lastSessionEndedAt || null,
      lastActive: now,
      updatedAt: now,
    };

    const mongoDb = await db.ensureReady();
    await mongoDb.collection(dbConfig.COLLECTIONS.QUEST_PROGRESS).updateOne(
      { _id: questProgressRef.id },
      [
        {
          $replaceWith: {
            $mergeObjects: [
              {
                $literal: {
                  _id: questProgressRef.id,
                  ...questProgress,
                },
              },
              { wrongAttempts: { $ifNull: ["$wrongAttempts", []] } },
            ],
          },
        },
      ],
      { upsert: true },
    );
    questProgress.wrongAttempts = await ensureQuestProgressWrongAttemptLevel(
      userId,
      questId,
      Number(level),
    );
    invalidateQuestRankingCache(questId);
    scheduleQuestDistributionBroadcast(req.io, questId);

    res.json({
      message: "Question timer started",
      startTime: now,
      questStartAtMs,
      timerEndAtMs,
      timeRemainingSeconds: Math.max(0, Math.ceil((timerEndAtMs - now.getTime()) / 1000)),
      isTimeExpired: now.getTime() >= timerEndAtMs,
      serverNowMs: now.getTime(),
      questDurationMinutes,
      questProgress,
      isResuming,
    });
  } catch (error) {
    console.error("Error starting question timer:", error);
    res.status(500).json({ error: "Failed to start timer" });
  }
};

export const closeQuestSessionRoute = async (req, res) => {
  try {
    const { questId } = req.params || {};
    const userId = String(req.playerId || "");
    if (!questId || !userId) {
      return res.status(400).json({ error: "questId and userId are required" });
    }

    const progress = await closeQuestSession(
      req.io,
      userId,
      questId,
      "abandoned",
    );

    return res.json({
      message: "Quest session paused",
      questId: String(questId),
      userId,
      totalActiveSeconds: getStoredActiveSeconds(progress || {}),
      status: progress?.status || "abandoned",
    });
  } catch (error) {
    console.error("Error closing quest session:", error);
    return res.status(500).json({ error: "Failed to close quest session" });
  }
};

export const getUserProgress = async (req, res) => {
  try {
    const userId = String(req.playerId || "");
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
        serverNowMs: Date.now(),
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

    return res.json({ progresses, serverNowMs: Date.now() });
  } catch (error) {
    console.error("Error fetching user progress:", error);
    return res.status(500).json({ error: "Failed to get progress" });
  }
};

export const getWrongAttempts = async (req, res) => {
  try {
    const userId = String(req.playerId || "");
    const questId = String(req.query?.questId || "").trim();
    const rawLevel = req.query?.level;

    if (!userId) {
      return res.status(400).json({ error: "Player identity is required" });
    }

    if (rawLevel !== undefined && !questId) {
      return res.status(400).json({
        error: "questId is required when level is provided",
      });
    }

    const eligibility = await ensurePlayerAllowed(userId);
    if (!eligibility.allowed) {
      return res.status(eligibility.status).json(eligibility.payload);
    }

    if (rawLevel !== undefined) {
      const level = Number(rawLevel);
      if (!Number.isInteger(level) || level < 1) {
        return res.status(400).json({ error: "level must be a positive integer" });
      }

      const questDoc = await db
        .collection(dbConfig.COLLECTIONS.QUESTS)
        .doc(questId)
        .get();
      if (!questDoc.exists) {
        return res.status(404).json({ error: "Quest not found" });
      }

      await ensureQuestProgressWrongAttemptLevel(userId, questId, level);
    }

    const mongoDb = await db.ensureReady();
    const user = await mongoDb
      .collection(dbConfig.COLLECTIONS.USERS)
      .findOne(
        { _id: userId },
        { projection: { wrongAttempt: 1 } },
      );
    const progressSnap = questId
      ? await getQuestProgressDocRef(userId, questId).get()
      : null;
    const countsByLevel = new Map();
    const progress = progressSnap?.exists ? progressSnap.data() || {} : {};

    for (const entry of Array.isArray(progress.wrongAttempts)
      ? progress.wrongAttempts
      : []) {
      const level = Number(entry?.level);
      if (!Number.isInteger(level) || level < 1) {
        continue;
      }

      const wrongCount = Number(entry?.wrongCount ?? entry?.count) || 0;
      const levelData = countsByLevel.get(level) || {
        wrongCount: 0,
        wrongAnswers: [],
      };
      levelData.wrongCount += wrongCount;
      const wrongAnswers = entry?.wrongAnswers ?? entry?.WrongAnswers;
      if (Array.isArray(wrongAnswers)) {
        levelData.wrongAnswers.push(
          ...wrongAnswers.filter((answer) => typeof answer === "string"),
        );
      }
      countsByLevel.set(level, levelData);
    }

    const levels = [...countsByLevel.entries()]
      .sort(([levelA], [levelB]) => levelA - levelB)
      .map(([level, levelData]) => ({ level, ...levelData }));

    return res.json({
      totalWrong: Number(user?.wrongAttempt) || 0,
      levels,
    });
  } catch (error) {
    console.error("Error fetching wrong-attempt counts:", error);
    return res.status(500).json({ error: "Failed to fetch wrong-attempt counts" });
  }
};

export const finalizeQuestAttempt = async (req, res) => {
  try {
    const { questId } = req.params || {};
    const {
      reason = "manual",
      solvedCount,
      totalQuestions,
      currentLevel,
    } = req.body || {};
    const userId = String(req.playerId || "");

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
    const sessionStartedMs = normalizeTimestampLike(existingProgress.currentSessionStartedAt);
    const runningSessionSeconds = Number.isFinite(sessionStartedMs)
      ? Math.max(0, Math.floor((now.getTime() - sessionStartedMs) / 1000))
      : 0;
    const finalElapsedSeconds = Number.isFinite(sessionStartedMs) ||
      Number.isFinite(Number(existingProgress.totalActiveSeconds))
      ? getStoredActiveSeconds(existingProgress) + runningSessionSeconds
      : Number.isFinite(questStartMs)
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
      totalActiveSeconds: finalElapsedSeconds,
      currentSessionStartedAt: null,
      lastSessionEndedAt: now,
      presenceSocketId: null,
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
    invalidateQuestRankingCache(questId);
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
    const { answer } = req.body || {};
    const userId = String(req.playerId || "");

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

    const questDoc = await db
      .collection(dbConfig.COLLECTIONS.QUESTS)
      .doc(String(questId))
      .get();
    if (!questDoc.exists) {
      return res.status(404).json({ error: "Quest not found" });
    }

    const questData = questDoc.data() || {};
    const initialServerNowMs = Date.now();
    if (initialServerNowMs >= getQuestEndAtMs(questData)) {
      return res
        .status(409)
        .json(getQuestExpiryPayload(questData, initialServerNowMs));
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
    const questionLevel = Number(question.level) || 1;
    const questProgressRef = getQuestProgressDocRef(userId, questId);
    const existingProgressSnapshot = await questProgressRef.get();
    const completedQuestionLevels = existingProgressSnapshot.exists
      ? existingProgressSnapshot.data()?.completedQuestionLevels || []
      : [];
    const isAlreadySolved = Array.isArray(completedQuestionLevels) &&
      completedQuestionLevels.some((entry) => {
        const completedQuestionId =
          entry && typeof entry === "object" ? String(entry.questionId || "") : "";
        const completedLevel =
          entry && typeof entry === "object"
            ? Number(entry.questionLevel || entry.level || 0)
            : Number(entry);
        return completedQuestionId
          ? completedQuestionId === String(questionId)
          : completedLevel === questionLevel;
      });

    if (isAlreadySolved) {
      return res.status(409).json({ error: "Question has already been solved" });
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
    const finalServerNowMs = Date.now();
    if (finalServerNowMs >= getQuestEndAtMs(questData)) {
      return res
        .status(409)
        .json(getQuestExpiryPayload(questData, finalServerNowMs));
    }

    let wrongAttempts = await ensureQuestProgressWrongAttemptLevel(
      userId,
      questId,
      questionLevel,
    );
    const mongoDb = await db.ensureReady();
    let totalWrong = Number(eligibility.userData?.wrongAttempt) || 0;
    if (!isCorrect) {
      await mongoDb.collection(dbConfig.COLLECTIONS.USERS).updateOne(
        { _id: String(userId) },
        [
          {
            $set: {
              wrongAttempt: {
                $add: [
                  {
                    $convert: {
                      input: "$wrongAttempt",
                      to: "int",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                  1,
                ],
              },
            },
          },
        ],
      );
      wrongAttempts = await ensureQuestProgressWrongAttemptLevel(
        userId,
        questId,
        questionLevel,
        true,
        String(answer || "").trim(),
      );
    }

    const updatedUser = await mongoDb
      .collection(dbConfig.COLLECTIONS.USERS)
      .findOne(
        { _id: String(userId) },
        { projection: { wrongAttempt: 1 } },
      );
    totalWrong = Number(updatedUser?.wrongAttempt) || 0;
    const levelWrongCount = wrongAttempts
      .filter((entry) => Number(entry?.level) === questionLevel)
      .reduce(
        (total, entry) =>
          total + (Number(entry?.wrongCount ?? entry?.count) || 0),
        0,
      );

    return res.json({
      isCorrect,
      message: isCorrect ? "Correct answer" : "Incorrect answer",
      totalWrong,
      wrongAttempt: totalWrong,
      levelWrongCount,
      levels: wrongAttempts
        .map((entry) => ({
          level: Number(entry?.level) || 0,
          wrongCount: Number(entry?.wrongCount ?? entry?.count) || 0,
          wrongAnswers: Array.isArray(entry?.wrongAnswers ?? entry?.WrongAnswers)
            ? (entry.wrongAnswers ?? entry.WrongAnswers).filter(
                (wrongAnswer) => typeof wrongAnswer === "string",
              )
            : [],
        }))
        .filter((entry) => entry.level > 0),
      question: {
        id: questionDoc.id,
        level: questionLevel,
        title: question.title || "",
      },
      serverNowMs: finalServerNowMs,
      contestEndAtMs: getQuestEndAtMs(questData),
    });
  } catch (error) {
    console.error("Error validating quest answer:", error);
    return res.status(500).json({ error: "Failed to validate answer" });
  }
};
