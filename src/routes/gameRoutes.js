import express from "express";
import {
  getPublicQuests,
  getPublicQuestQuestions,
  loginPlayer,
  updatePlayerProgress,
  startQuestionTimer,
} from "../Controllers/gameController.js";

const router = express.Router();

router.post("/login", loginPlayer);
router.get("/quests", getPublicQuests);
router.get("/quests/:questId/questions", getPublicQuestQuestions);
router.post("/update-progress", updatePlayerProgress);
router.post("/start-timer", startQuestionTimer);

export default router;
