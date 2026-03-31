const getTokenFromHeaders = (req) => {
  const bearerHeader = req.headers.authorization || ""
  const bearerToken = bearerHeader.startsWith("Bearer ")
    ? bearerHeader.slice("Bearer ".length).trim()
    : ""

  const adminTokenHeader = req.headers["x-admin-token"] || ""

  return bearerToken || adminTokenHeader
}

const getRoleFromHeaders = (req) => {
  const roleHeader = req.headers["x-admin-role"] || req.headers["x-user-role"] || ""
  const normalizedRole = String(roleHeader).trim().toLowerCase()

  if (normalizedRole === "admin" || normalizedRole === "invigilator") {
    return normalizedRole
  }

  return "admin"
}

export const adminAuth = (req, res, next) => {
  const expectedToken = process.env.ADMIN_API_TOKEN

  if (!expectedToken) {
    return res.status(503).json({
      error: "Admin API is not configured",
      details: "Set ADMIN_API_TOKEN in server environment"
    })
  }

  const receivedToken = getTokenFromHeaders(req)

  if (!receivedToken || receivedToken !== expectedToken) {
    return res.status(401).json({ error: "Unauthorized admin request" })
  }

  req.adminRole = getRoleFromHeaders(req)

  next()
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
