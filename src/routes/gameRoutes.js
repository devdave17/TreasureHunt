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

const router = express.Router();

router.post("/login", loginPlayer);
router.get("/quests", getPublicQuests);
router.get("/quests/:questId/questions", getPublicQuestQuestions);
router.get("/quests/:questId/ranking", getQuestRanking);
router.get("/quests/:questId/level-distribution", getQuestLevelDistribution);
router.post("/quests/:questId/questions/:questionId/validate", validateQuestAnswer);
router.post("/quests/:questId/finalize", finalizeQuestAttempt);
router.post("/update-progress", updatePlayerProgress);
router.post("/start-timer", startQuestionTimer);
router.get("/progress/:userId", getUserProgress);

export default router;
