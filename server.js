import express from "express"
import cors from "cors"
import "dotenv/config"
import path from "path"
import { fileURLToPath } from "url"

import adminRoutes from "./src/routes/adminRoutes.js"
import { adminAuth } from "./src/backend/middleware/adminAuth.js"
import { loginAdmin } from "./src/Controllers/adminAuthController.js"

const app = express()
const PORT = Number(process.env.PORT) || 5001

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors())
app.use(express.json())

// 🔥 CSP (yaha hi rehne de - routes se pehle)
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https:;"
  )
  next()
})

// 👇 routes
app.post("/admin/auth/login", loginAdmin)
app.use("/admin", adminAuth, adminRoutes)

// 🔥 IMPORTANT: FRONTEND SERVE (YEH ADD KARNA HAI)
app.use(express.static(path.join(__dirname, "dist")))

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"))
})

// 👇 last me server start
app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`)
})