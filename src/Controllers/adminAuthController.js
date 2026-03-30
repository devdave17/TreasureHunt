export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body || {}

    const expectedUsername = process.env.ADMIN_USERNAME
    const expectedPassword = process.env.ADMIN_PASSWORD
    const adminApiToken = process.env.ADMIN_API_TOKEN

    if (!expectedUsername || !expectedPassword || !adminApiToken) {
      return res.status(503).json({
        error: "Admin auth is not configured",
        details: "Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_API_TOKEN"
      })
    }

    if (!username || !password) {
      return res.status(400).json({ error: "username and password are required" })
    }

    const normalizedInputUsername = String(username).trim().toLowerCase()
    const normalizedExpectedUsername = String(expectedUsername).trim().toLowerCase()
    const normalizedInputPassword = String(password).trim()
    const normalizedExpectedPassword = String(expectedPassword).trim()

    if (
      normalizedInputUsername !== normalizedExpectedUsername ||
      normalizedInputPassword !== normalizedExpectedPassword
    ) {
      return res.status(401).json({ error: "Invalid admin credentials" })
    }

    res.json({
      message: "Login successful",
      token: adminApiToken
    })
  } catch (error) {
    console.error("Error in admin login:", error)
    res.status(500).json({ error: "Failed to login" })
  }
}
