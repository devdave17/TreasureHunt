import express from "express"
import cors from "cors"
import "dotenv/config"
import path from "path"
import { fileURLToPath } from "url"
import { createServer } from "http"
import { Server as SocketIOServer } from "socket.io"

import adminRoutes from "./src/routes/adminRoutes.js"
import gameRoutes from "./src/routes/gameRoutes.js"
import { adminAuth } from "./src/backend/middleware/adminAuth.js"
import { loginAdmin } from "./src/Controllers/adminAuthController.js"
import { db } from "./src/backend/database/dbConfig.js"
import { normalizeQuestSchedule } from "./src/utils/questTiming.js"

const app = express()
const PORT = Number(process.env.PORT) || 5001

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
})

app.use(cors())
app.use(express.json())
app.set("io", io)

app.use((req, res, next) => {
  req.io = io
  next()
})

// 🔥 CSP (yaha hi rehne de - routes se pehle)
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https: ws: wss:;"
  )
  next()
})

// 👇 routes
app.post("/admin/auth/login", loginAdmin)
app.use("/admin", adminAuth, adminRoutes)
app.use("/game", gameRoutes)

// 🔥 IMPORTANT: FRONTEND SERVE (YEH ADD KARNA HAI)
app.use(express.static(path.join(__dirname, "dist")))

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"))
})

let isQuestListenerReady = false
db.collection("quests").onSnapshot(
  (snapshot) => {
    if (!isQuestListenerReady) {
      isQuestListenerReady = true
      return
    }

    snapshot.docChanges().forEach((change) => {
      if (change.type === "removed") {
        io.emit("quest-changed", {
          action: "deleted",
          questId: change.doc.id
        })
        return
      }

      io.emit("quest-changed", {
        action: change.type === "added" ? "created" : "updated",
        quest: {
          id: change.doc.id,
          ...normalizeQuestSchedule(change.doc.data() || {})
        }
      })
    })
  },
  (error) => {
    console.error("Quest realtime listener failed:", error)
  }
)

// 👇 last me server start
httpServer.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`)
})