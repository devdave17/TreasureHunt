const getTokenFromHeaders = (req) => {
  const bearerHeader = req.headers.authorization || ""
  const bearerToken = bearerHeader.startsWith("Bearer ")
    ? bearerHeader.slice("Bearer ".length).trim()
    : ""

  const adminTokenHeader = req.headers["x-admin-token"] || ""

  return bearerToken || adminTokenHeader
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

  next()
}
