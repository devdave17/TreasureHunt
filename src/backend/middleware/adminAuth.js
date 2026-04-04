import dotenv from "dotenv"
import jwt from "jsonwebtoken"

dotenv.config()

const getTokenFromHeaders = (req) => {
  const bearerHeader = req.headers.authorization || ""
  const bearerToken = bearerHeader.startsWith("Bearer ")
    ? bearerHeader.slice("Bearer ".length).trim()
    : ""

  const adminTokenHeader = req.headers["x-admin-token"] || ""

  return bearerToken || adminTokenHeader
}

export const adminAuth = (req, res, next) => {
  const jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.ADMIN_API_TOKEN

  if (!jwtSecret) {
    return res.status(503).json({
      error: "Admin API is not configured",
      details: "Set ADMIN_JWT_SECRET (or ADMIN_API_TOKEN fallback) in server environment"
    })
  }

  const receivedToken = getTokenFromHeaders(req)

  if (!receivedToken) {
    return res.status(401).json({ error: "Unauthorized admin request" })
  }

  try {
    const payload = jwt.verify(receivedToken, jwtSecret)
    const role = String(payload?.role || "").trim().toLowerCase()

    if (payload?.type !== "admin" || (role !== "admin" && role !== "invigilator")) {
      return res.status(401).json({ error: "Unauthorized admin request" })
    }

    req.adminRole = role
    req.adminTokenPayload = payload
    next()
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized admin request" })
  }
}

export const requireRoles = (allowedRoles = []) => (req, res, next) => {
  const role = req.adminRole || "admin"

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      error: "Forbidden",
      details: `Role '${role}' is not allowed for this action`
    })
  }

  next()
}
