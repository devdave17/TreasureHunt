import express from "express"
import { getPublicQuests, getPublicQuestQuestions, loginPlayer } from "../Controllers/gameController.js"

const router = express.Router()

router.post("/login", loginPlayer)
router.get("/quests", getPublicQuests)
router.get("/quests/:questId/questions", getPublicQuestQuestions)

export default router
