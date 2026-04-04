import express from "express";
import {
  getPublicQuests,
  getPublicQuestQuestions,
  getQuestRanking,
  getQuestLevelDistribution,
  getUserProgress,
  loginPlayer,
  updatePlayerProgress,
  startQuestionTimer,
  finalizeQuestAttempt,
  validateQuestAnswer,
} from "../Controllers/gameController.js";
import { playerAuth } from "../backend/middleware/playerAuth.js";
import {
  playerLoginLimiter,
  validateAnswerLimiter,
  updateProgressLimiter,
} from "../backend/middleware/rateLimiters.js";

const router = express.Router();

router.post("/login", playerLoginLimiter, loginPlayer);
router.get("/quests", getPublicQuests);
router.get("/quests/:questId/questions", getPublicQuestQuestions);
router.get("/quests/:questId/ranking", getQuestRanking);
router.get("/quests/:questId/level-distribution", getQuestLevelDistribution);
router.post(
  "/quests/:questId/questions/:questionId/validate",
  playerAuth,
  validateAnswerLimiter,
  validateQuestAnswer,
);
router.post("/quests/:questId/finalize", playerAuth, finalizeQuestAttempt);
router.post("/update-progress", playerAuth, updateProgressLimiter, updatePlayerProgress);
router.post("/start-timer", playerAuth, startQuestionTimer);
router.get("/progress/:userId", playerAuth, getUserProgress);

export default router;
