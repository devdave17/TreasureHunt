import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import express from "express";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

const PLAYER_ID = "tracking-player";
const QUEST_ID = "tracking-quest";
const PLAYER_PASSWORD = "test-player-password";

let app;
let db;
let dbConfig;
let mongoServer;
let users;
let quests;
let questions;
let questProgress;

const login = async (email = "player@example.test") => {
  const response = await request(app)
    .post("/game/login")
    .send({ email, password: PLAYER_PASSWORD });
  expect(response.status).toBe(200);
  return response.body.token;
};

const startLevel = async (token, level) => {
  const response = await request(app)
    .post("/game/start-timer")
    .set("x-player-token", token)
    .send({ userId: PLAYER_ID, questId: QUEST_ID, level });
  expect(response.status).toBe(200);
  return response;
};

const submitAnswer = (token, questionId, answer) =>
  request(app)
    .post(`/game/quests/${QUEST_ID}/questions/${questionId}/validate`)
    .set("x-player-token", token)
    .send({ answer });

const getPlayerWrongAttempt = async (userId = PLAYER_ID) => {
  const player = await users.findOne({ _id: userId });
  return Number(player?.wrongAttempt) || 0;
};

const getQuestWrongAttempts = async () => {
  const progress = await questProgress.findOne({
    _id: `${PLAYER_ID}_${QUEST_ID}`,
  });
  return progress?.wrongAttempts || [];
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.MONGO_DB_NAME = "treasurehunt-tests";
  process.env.PLAYER_MASTER_PASSWORD = PLAYER_PASSWORD;
  process.env.PLAYER_JWT_SECRET = "test-player-jwt-secret";

  ({ db, dbConfig } = await import("../src/backend/database/dbConfig.js"));
  const { default: gameRoutes } = await import("../src/routes/gameRoutes.js");

  app = express();
  app.use(express.json());
  app.use("/game", gameRoutes);

  const mongoDb = await db.ensureReady();
  users = mongoDb.collection("users");
  quests = mongoDb.collection("quests");
  questions = mongoDb.collection("questions");
  questProgress = mongoDb.collection("questProgress");
});

beforeEach(async () => {
  await Promise.all([
    users.deleteMany({}),
    quests.deleteMany({}),
    questions.deleteMany({}),
    questProgress.deleteMany({}),
  ]);
  await users.insertOne({
    _id: PLAYER_ID,
    email: "player@example.test",
    name: "Test Player",
  });
  await quests.insertOne({
    _id: QUEST_ID,
    name: "Tracking Quest",
    startAtMs: Date.now() - 30_000,
    durationMinutes: 60,
    isActive: true,
  });
  await questions.insertMany([
    {
      _id: "tracking-question-1",
      questId: QUEST_ID,
      level: 1,
      title: "Level one",
      correctAnswer: "correct-one",
    },
    {
      _id: "tracking-question-2",
      questId: QUEST_ID,
      level: 2,
      title: "Level two",
      correctAnswer: "correct-two",
    },
  ]);
});

afterAll(async () => {
  if (dbConfig) {
    await dbConfig.closeConnection();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe("wrong submission tracking", () => {
  it("backfills missing login totals without resetting existing totals", async () => {
    const newUserToken = await login();
    expect(newUserToken).toBeTruthy();
    expect(await getPlayerWrongAttempt()).toBe(0);

    await users.insertOne({
      _id: "existing-player",
      email: "existing@example.test",
      name: "Existing Player",
      wrongAttempt: 6,
    });
    const existingLogin = await request(app)
      .post("/game/login")
      .send({ email: "existing@example.test", password: PLAYER_PASSWORD });

    expect(existingLogin.status).toBe(200);
    expect(existingLogin.body.player.wrongAttempt).toBe(6);
    expect(await getPlayerWrongAttempt("existing-player")).toBe(6);
  });

  it("creates exactly one zero-count entry when level 1 starts", async () => {
    const token = await login();
    const response = await startLevel(token, 1);
    await startLevel(token, 1);

    expect(response.body.questProgress.wrongAttempts).toEqual([
      { level: 1, wrongCount: 0, wrongAnswers: [] },
    ]);
    expect(await getQuestWrongAttempts()).toEqual([
      { level: 1, wrongCount: 0, wrongAnswers: [] },
    ]);
  });

  it("increments both counters for a valid wrong answer", async () => {
    const token = await login();
    await startLevel(token, 1);

    const response = await submitAnswer(
      token,
      "tracking-question-1",
      " Wrong Answer ",
    );

    expect(response.status).toBe(200);
    expect(response.body.isCorrect).toBe(false);
    expect(response.body.totalWrong).toBe(1);
    expect(response.body.levelWrongCount).toBe(1);
    expect(response.body.levels).toEqual([
      { level: 1, wrongCount: 1, wrongAnswers: ["Wrong Answer"] },
    ]);
    expect(await getPlayerWrongAttempt()).toBe(1);
    expect(await getQuestWrongAttempts()).toEqual([
      { level: 1, wrongCount: 1, wrongAnswers: ["Wrong Answer"] },
    ]);
  });

  it("accumulates three rapid wrong submissions without losing increments", async () => {
    const token = await login();
    await startLevel(token, 1);

    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        submitAnswer(token, "tracking-question-1", "wrong"),
      ),
    );

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await getPlayerWrongAttempt()).toBe(3);
    expect(await getQuestWrongAttempts()).toEqual([
      { level: 1, wrongCount: 3, wrongAnswers: ["wrong", "wrong", "wrong"] },
    ]);
  });

  it("does not increment counters for correct or already-solved submissions", async () => {
    const token = await login();
    await startLevel(token, 1);

    const correct = await submitAnswer(
      token,
      "tracking-question-1",
      "correct-one",
    );
    expect(correct.status).toBe(200);
    expect(correct.body.isCorrect).toBe(true);

    await request(app)
      .post("/game/update-progress")
      .set("x-player-token", token)
      .send({
        userId: PLAYER_ID,
        questId: QUEST_ID,
        questionId: "tracking-question-1",
        level: 1,
        points: 10,
      })
      .expect(200);

    const alreadySolved = await submitAnswer(
      token,
      "tracking-question-1",
      "wrong",
    );
    expect(alreadySolved.status).toBe(409);
    expect(await getPlayerWrongAttempt()).toBe(0);
    expect(await getQuestWrongAttempts()).toEqual([
      { level: 1, wrongCount: 0, wrongAnswers: [] },
    ]);
  });

  it("tracks level 2 separately and leaves level 1 unchanged", async () => {
    const token = await login();
    await startLevel(token, 1);
    await submitAnswer(token, "tracking-question-1", "wrong");
    await submitAnswer(token, "tracking-question-1", "wrong");

    await startLevel(token, 2);
    const levelTwoResponse = await submitAnswer(
      token,
      "tracking-question-2",
      "wrong",
    );

    expect(levelTwoResponse.body.levelWrongCount).toBe(1);
    expect(await getPlayerWrongAttempt()).toBe(3);
    const attempts = await getQuestWrongAttempts();
    expect(attempts).toEqual(
      expect.arrayContaining([
        { level: 1, wrongCount: 2, wrongAnswers: ["wrong", "wrong"] },
        { level: 2, wrongCount: 1, wrongAnswers: ["wrong"] },
      ]),
    );
    expect(attempts.filter((entry) => entry.level === 1)).toHaveLength(1);
  });

  it("does not increment counters for invalid or unauthenticated submissions", async () => {
    const token = await login();
    const invalid = await submitAnswer(token, "tracking-question-1", "   ");
    const unauthenticated = await request(app)
      .post(`/game/quests/${QUEST_ID}/questions/tracking-question-1/validate`)
      .send({ answer: "wrong" });

    expect(invalid.status).toBe(400);
    expect(unauthenticated.status).toBe(401);
    expect(await getPlayerWrongAttempt()).toBe(0);
    expect(await getQuestWrongAttempts()).toEqual([]);
  });

  it("returns global totals and quest-scoped level counts", async () => {
    const token = await login();
    await startLevel(token, 1);
    await submitAnswer(token, "tracking-question-1", "wrong");
    await startLevel(token, 2);
    await submitAnswer(token, "tracking-question-2", "wrong");

    const response = await request(app)
      .get(`/game/progress/wrong-attempts?questId=${QUEST_ID}`)
      .set("x-player-token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalWrong: 2,
      levels: [
        { level: 1, wrongCount: 1, wrongAnswers: ["wrong"] },
        { level: 2, wrongCount: 1, wrongAnswers: ["wrong"] },
      ],
    });
  });

  it("merges legacy duplicate level entries instead of creating another", async () => {
    const token = await login();
    await startLevel(token, 1);
    await questProgress.updateOne(
      { _id: `${PLAYER_ID}_${QUEST_ID}` },
      {
        $set: {
          wrongAttempts: [
            { level: 1, count: 2, WrongAnswers: ["Old Wrong Answer"] },
            { level: 1, wrongCount: 3 },
          ],
        },
      },
    );

    const response = await request(app)
      .get(`/game/progress/wrong-attempts?questId=${QUEST_ID}&level=1`)
      .set("x-player-token", token);

    expect(response.status).toBe(200);
    expect(response.body.levels).toEqual([
      {
        level: 1,
        wrongCount: 5,
        wrongAnswers: ["Old Wrong Answer"],
      },
    ]);
    expect(await getQuestWrongAttempts()).toEqual([
      {
        level: 1,
        wrongCount: 5,
        wrongAnswers: ["Old Wrong Answer"],
      },
    ]);
  });
});
