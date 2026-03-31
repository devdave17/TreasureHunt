import express from "express"
import { requireRoles } from "../backend/middleware/adminAuth.js"
import {
	addUser,
	bulkAddUsers,
	seedUsersFromFile,
	getUsers,
	blockUser,
	updateLevel,
	deleteUser,
	deleteAllUsers,
	getQuests,
	addQuest,
	updateQuest,
	deleteQuest,
	getQuestions,
	addQuestion,
	updateQuestion,
	deleteQuestion
} from "../Controllers/adminController.js"

const router = express.Router()

router.post("/users", requireRoles(["admin"]), addUser)
router.post("/users/bulk", requireRoles(["admin"]), bulkAddUsers)
router.post("/users/seed", requireRoles(["admin"]), seedUsersFromFile)
router.get("/users", requireRoles(["admin", "invigilator"]), getUsers)
router.post("/block", requireRoles(["admin", "invigilator"]), blockUser)
router.post("/update-level", requireRoles(["admin"]), updateLevel)
router.delete("/users/:userId", requireRoles(["admin"]), deleteUser)
router.delete("/users", requireRoles(["admin"]), deleteAllUsers)

router.get("/quests", requireRoles(["admin"]), getQuests)
router.post("/quests", requireRoles(["admin"]), addQuest)
router.put("/quests/:questId", requireRoles(["admin"]), updateQuest)
router.delete("/quests/:questId", requireRoles(["admin"]), deleteQuest)

router.get("/questions", requireRoles(["admin"]), getQuestions)
router.post("/add-question", requireRoles(["admin"]), addQuestion)
router.put("/questions/:questionId", requireRoles(["admin"]), updateQuestion)
router.delete("/questions/:questionId", requireRoles(["admin"]), deleteQuestion)

export default router