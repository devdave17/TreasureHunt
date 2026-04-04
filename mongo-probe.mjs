import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
const dbName = process.env.MONGO_DB_NAME || process.env.MONGODB_DB || "treasurehunt";

if (!uri) {
  throw new Error("Missing MONGO_URI/MONGODB_URI");
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);
  const collections = await db.listCollections().toArray();

  console.log("Connected OK");
  console.log("DB:", dbName);
  console.log("Collections:", collections.map((c) => c.name).join(", ") || "(none)");

  const usersCount = await db.collection("users").countDocuments();
  const questsCount = await db.collection("quests").countDocuments();
  const questionsCount = await db.collection("questions").countDocuments();
  const progressCount = await db.collection("questProgress").countDocuments();

  console.log(
    "Counts => users:",
    usersCount,
    "quests:",
    questsCount,
    "questions:",
    questionsCount,
    "questProgress:",
    progressCount
  );
} finally {
  await client.close();
}
