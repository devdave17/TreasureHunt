import express from "express"
import cors from "cors"
import "dotenv/config"
import adminRoutes from "./src/routes/adminRoutes.js"
import { adminAuth } from "./src/backend/middleware/adminAuth.js"
import { loginAdmin } from "./src/Controllers/adminAuthController.js"

const app = express()
const PORT = Number(process.env.PORT) || 5001

app.use(cors())
app.use(express.json())

// 🔥 ADD THIS (CSP FIX)
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https:;"
  )
  next()
})

app.post("/admin/auth/login", loginAdmin)
app.use("/admin", adminAuth, adminRoutes)

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`)
})