import express from "express"
import {
	addUser,
	bulkAddUsers,
	seedUsersFromFile,
	getUsers,
	blockUser,
	updateLevel,
	deleteUser,
	deleteAllUsers,
	getQuestions,
	addQuestion,
	updateQuestion,
	deleteQuestion
} from "../Controllers/adminController.js"

const router = express.Router()

router.post("/users", addUser)
router.post("/users/bulk", bulkAddUsers)
router.post("/users/seed", seedUsersFromFile)
router.get("/users", getUsers)
router.post("/block", blockUser)
router.post("/update-level", updateLevel)
router.delete("/users/:userId", deleteUser)
router.delete("/users", deleteAllUsers)

router.get("/questions", getQuestions)
router.post("/add-question", addQuestion)
router.put("/questions/:questionId", updateQuestion)
router.delete("/questions/:questionId", deleteQuestion)

export default router