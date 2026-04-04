import express from "express"
import cors from "cors"
import "dotenv/config"
import path from "path"
import { fileURLToPath } from "url"
import { createServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import process from "node:process"

import adminRoutes from "./src/routes/adminRoutes.js"
import gameRoutes from "./src/routes/gameRoutes.js"
import { adminAuth } from "./src/backend/middleware/adminAuth.js"
import { loginAdmin } from "./src/Controllers/adminAuthController.js"
import { db } from "./src/backend/database/dbConfig.js"
import { adminLoginLimiter } from "./src/backend/middleware/rateLimiters.js"

const app = express()
const PORT = Number(process.env.PORT) || 5001

// Render/Vercel proxy chain ke liye correct client IP trust kare.
app.set("trust proxy", 1)

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
app.post("/admin/auth/login", adminLoginLimiter, loginAdmin)
app.use("/admin", adminAuth, adminRoutes)
app.use("/game", gameRoutes)

// 🔥 IMPORTANT: FRONTEND SERVE (YEH ADD KARNA HAI)
app.use(express.static(path.join(__dirname, "dist")))

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"))
})

// Verify DB connectivity on boot so deployment issues fail fast with clear logs.
try {
  await db.ensureReady()
  console.log("✅ MongoDB connected")
} catch (error) {
  console.error("❌ MongoDB connection failed at startup:", error)
  process.exit(1)
}

// 👇 last me server start
httpServer.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`)
})

io.on("connection", (socket) => {
  socket.on("join-quest-room", (questId) => {
    const normalizedQuestId = String(questId || "").trim()
    if (!normalizedQuestId) {
      return
    }

    const nextRoom = `quest:${normalizedQuestId}`
    const previousRoom = socket.data?.questRoom

    if (previousRoom && previousRoom !== nextRoom) {
      socket.leave(previousRoom)
    }

    socket.join(nextRoom)
    socket.data.questRoom = nextRoom
  })

  socket.on("leave-quest-room", (questId) => {
    const normalizedQuestId = String(questId || "").trim()
    const room = normalizedQuestId ? `quest:${normalizedQuestId}` : socket.data?.questRoom

    if (room) {
      socket.leave(room)
      if (socket.data?.questRoom === room) {
        socket.data.questRoom = null
      }
    }
  })

  socket.on("disconnect", () => {
    socket.data.questRoom = null
  })
})