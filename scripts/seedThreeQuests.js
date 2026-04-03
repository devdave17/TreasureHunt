import "dotenv/config"
import { db, dbConfig } from "../src/backend/database/dbConfig.js"

const now = Date.now()

const questsToCreate = [
  {
    name: "Algorithm Arena",
    code: "AA-2026",
    description: "Speed-focused algorithmic quest with mixed difficulty.",
    durationMinutes: 75,
    startAtMs: now - 60_000,
    startAt: new Date(now - 60_000),
    isActive: true,
    questionCount: 5,
    questionTemplate: [
      {
        title: "Binary Beacon",
        riddleText: "I split the search space in two each step.",
        problemStatement: "Given a sorted array and target, return target index or -1.",
        correctAnswer: "binary-search",
        difficulty: "Easy",
        score: 10
      },
      {
        title: "Prefix Vault",
        riddleText: "I answer repeated range sums instantly.",
        problemStatement: "Build prefix sums and answer Q range sum queries.",
        correctAnswer: "prefix-sum",
        difficulty: "Easy",
        score: 10
      },
      {
        title: "Window Sprint",
        riddleText: "I move left and right but never restart.",
        problemStatement: "Find longest substring with at most K distinct chars.",
        correctAnswer: "sliding-window",
        difficulty: "Medium",
        score: 15
      },
      {
        title: "Heap Signal",
        riddleText: "I always surface the best candidate first.",
        problemStatement: "Return k largest values from a stream.",
        correctAnswer: "max-heap",
        difficulty: "Medium",
        score: 15
      },
      {
        title: "Graph Pulse",
        riddleText: "I visit nearest first using weighted edges.",
        problemStatement: "Compute shortest path from source to all nodes.",
        correctAnswer: "dijkstra",
        difficulty: "Hard",
        score: 20
      }
    ]
  },
  {
    name: "Data Structure Dominion",
    code: "DSD-2026",
    description: "Quest focused on stacks, queues, trees, and hash maps.",
    durationMinutes: 90,
    startAtMs: now - 60_000,
    startAt: new Date(now - 60_000),
    isActive: true,
    questionCount: 6,
    questionTemplate: [
      {
        title: "Stack Sentinel",
        riddleText: "LIFO is my law.",
        problemStatement: "Validate balanced parentheses for input string.",
        correctAnswer: "balanced",
        difficulty: "Easy",
        score: 10
      },
      {
        title: "Queue Relay",
        riddleText: "First in, first out wins.",
        problemStatement: "Simulate queue operations and print final front.",
        correctAnswer: "queue-front",
        difficulty: "Easy",
        score: 10
      },
      {
        title: "Hash Keeper",
        riddleText: "I trade memory for speed.",
        problemStatement: "Count frequencies and output highest occurrence key.",
        correctAnswer: "hashmap",
        difficulty: "Medium",
        score: 15
      },
      {
        title: "BST Watch",
        riddleText: "Left small, right large.",
        problemStatement: "Insert N keys in BST and return inorder traversal.",
        correctAnswer: "inorder",
        difficulty: "Medium",
        score: 15
      },
      {
        title: "Trie Echo",
        riddleText: "I store words by prefixes.",
        problemStatement: "Implement prefix search for given dictionary.",
        correctAnswer: "trie",
        difficulty: "Hard",
        score: 20
      },
      {
        title: "Union Shield",
        riddleText: "I merge sets and detect cycles.",
        problemStatement: "Detect cycle in undirected graph using DSU.",
        correctAnswer: "union-find",
        difficulty: "Hard",
        score: 20
      }
    ]
  },
  {
    name: "Dynamic Docket",
    code: "DD-2026",
    description: "Compact DP quest with sequence and knapsack patterns.",
    durationMinutes: 60,
    startAtMs: now - 60_000,
    startAt: new Date(now - 60_000),
    isActive: true,
    questionCount: 3,
    questionTemplate: [
      {
        title: "Climb Counter",
        riddleText: "I reuse previous states to move ahead.",
        problemStatement: "Count ways to climb n stairs with steps 1 or 2.",
        correctAnswer: "fib-dp",
        difficulty: "Easy",
        score: 10
      },
      {
        title: "Subsequence Lens",
        riddleText: "I keep best ending at each index.",
        problemStatement: "Find length of longest increasing subsequence.",
        correctAnswer: "lis",
        difficulty: "Medium",
        score: 15
      },
      {
        title: "Knapsack Core",
        riddleText: "Pick value under weight limit.",
        problemStatement: "Solve 0/1 knapsack for max value.",
        correctAnswer: "knapsack",
        difficulty: "Hard",
        score: 20
      }
    ]
  }
]

const seed = async () => {
  const created = []

  for (const questDef of questsToCreate) {
    const existingCodeSnapshot = await db
      .collection(dbConfig.COLLECTIONS.QUESTS)
      .where("code", "==", questDef.code)
      .limit(1)
      .get()

    let questId = ""
    if (!existingCodeSnapshot.empty) {
      const existingQuest = existingCodeSnapshot.docs[0]
      questId = existingQuest.id

      await db.collection(dbConfig.COLLECTIONS.QUESTS).doc(questId).update({
        name: questDef.name,
        description: questDef.description,
        durationMinutes: questDef.durationMinutes,
        startAtMs: questDef.startAtMs,
        startAt: questDef.startAt,
        isActive: true,
        updatedAt: new Date()
      })
    } else {
      const questRef = await db.collection(dbConfig.COLLECTIONS.QUESTS).add({
        name: questDef.name,
        code: questDef.code,
        description: questDef.description,
        durationMinutes: questDef.durationMinutes,
        startAtMs: questDef.startAtMs,
        startAt: questDef.startAt,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      questId = questRef.id
    }

    const existingQuestionsSnapshot = await db
      .collection(dbConfig.COLLECTIONS.QUESTIONS)
      .where("questId", "==", questId)
      .get()

    const existingQuestionByLevel = new Map(
      existingQuestionsSnapshot.docs.map((doc) => [Number(doc.data()?.level), doc])
    )

    for (let i = 0; i < questDef.questionTemplate.length; i += 1) {
      const level = i + 1
      const template = questDef.questionTemplate[i]
      const payload = {
        questId,
        questName: questDef.name,
        level,
        title: template.title,
        riddleText: template.riddleText,
        problemStatement: template.problemStatement,
        correctAnswer: template.correctAnswer,
        score: template.score,
        difficulty: template.difficulty,
        updatedAt: new Date()
      }

      if (existingQuestionByLevel.has(level)) {
        const existingQuestion = existingQuestionByLevel.get(level)
        await db.collection(dbConfig.COLLECTIONS.QUESTIONS).doc(existingQuestion.id).update(payload)
      } else {
        await db.collection(dbConfig.COLLECTIONS.QUESTIONS).add({
          ...payload,
          createdAt: new Date()
        })
      }
    }

    created.push({
      questId,
      code: questDef.code,
      name: questDef.name,
      questions: questDef.questionTemplate.length
    })
  }

  console.log("Seed complete:")
  created.forEach((quest) => {
    console.log(`- ${quest.name} (${quest.code}) | questId=${quest.questId} | questions=${quest.questions}`)
  })
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await dbConfig.closeConnection()
  })
