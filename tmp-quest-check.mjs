import dotenv from "dotenv";
import { db, dbConfig } from "./src/backend/database/dbConfig.js";
import { normalizeQuestSchedule } from "./src/utils/questTiming.js";

dotenv.config();

try {
  const snapshot = await db.collection(dbConfig.COLLECTIONS.QUESTS).get();
  const quests = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((quest) => quest.isActive !== false)
    .map((quest) => ({
      id: quest.id,
      name: quest.name || "Untitled Quest",
      code: quest.code || "",
      description: quest.description || "",
      ...normalizeQuestSchedule(quest),
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  console.log("Quest fetch logic OK. Count:", quests.length);
  console.log(JSON.stringify(quests.slice(0, 2), null, 2));
} catch (error) {
  console.error("Quest fetch logic FAILED:", error);
  process.exit(1);
}
