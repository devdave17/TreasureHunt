import dotenv from "dotenv"

dotenv.config()

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body || {}

    const expectedUsername = process.env.ADMIN_USERNAME
    const expectedPassword = process.env.ADMIN_PASSWORD
    const invigilatorUsername = process.env.INVIGILATOR_USERNAME
    const invigilatorPassword = process.env.INVIGILATOR_PASSWORD
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
    const normalizedInvigilatorUsername = String(invigilatorUsername || "").trim().toLowerCase()
    const normalizedInputPassword = String(password).trim()
    const normalizedExpectedPassword = String(expectedPassword).trim()
    const normalizedInvigilatorPassword = String(invigilatorPassword || "").trim()

    const isAdminLogin =
      normalizedInputUsername === normalizedExpectedUsername &&
      normalizedInputPassword === normalizedExpectedPassword

    const isInvigilatorLogin =
      normalizedInvigilatorUsername &&
      normalizedInvigilatorPassword &&
      normalizedInputUsername === normalizedInvigilatorUsername &&
      normalizedInputPassword === normalizedInvigilatorPassword

    if (!isAdminLogin && !isInvigilatorLogin) {
      return res.status(401).json({ error: "Invalid admin credentials" })
    }

    const role = isInvigilatorLogin ? "invigilator" : "admin"

    res.json({
      message: "Login successful",
      token: adminApiToken,
      role
    })
  } catch (error) {
    console.error("Error in admin login:", error)
    res.status(500).json({ error: "Failed to login" })
  }
}
