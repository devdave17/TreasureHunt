import { useEffect, useState } from "react"
import "./admin.css"
import "./admin-horror.css"
import { HauntedScene } from "../components/HorrorAtmosphere"
import OfficialLogo from "../components/OfficialLogo"
import AdminLayout from "./components/AdminLayout"
import { api } from "./api"

const TOKEN_STORAGE_KEY = "treasurehunt_admin_token"
const ROLE_STORAGE_KEY = "treasurehunt_admin_role"

function Admin() {
  const [authToken, setAuthToken] = useState(
    () => window.localStorage.getItem(TOKEN_STORAGE_KEY) || ""
  )
  const [role, setRole] = useState(
    () => window.localStorage.getItem(ROLE_STORAGE_KEY) || ""
  )
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const handleLogin = async (event) => {
    event.preventDefault()
    setError("")
    setSuccessMessage("")

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required")
      return
    }

    setIsLoggingIn(true)

    try {
      const data = await api.login(username.trim(), password)
      
      window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
      window.localStorage.setItem(ROLE_STORAGE_KEY, data.role || "admin")
      setAuthToken(data.token)
      setRole(data.role || "admin")
      setPassword("")
      setSuccessMessage("Login successful")
    } catch (err) {
      setError(err.message || "Unable to login")
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = () => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(ROLE_STORAGE_KEY)
    setAuthToken("")
    setRole("")
    setPassword("")
    setUsername("")
    setError("")
    setSuccessMessage("Logged out successfully")
  }

  useEffect(() => {
    // Initialize auth state from localStorage on mount
  }, [])

  if (!authToken) {
    return (
      <main className="admin-page admin-login-page">
        <aside className="admin-login-story" aria-label="Treasure of Code administration"><HauntedScene /><div className="admin-login-brand"><OfficialLogo /><span>CEREBRO / TREASURE OF CODE</span></div><div className="admin-login-story-copy"><p>BEHIND THE HAUNTED GATES</p><h1>Every haunt<br />needs a <em>keeper.</em></h1><span>The control room for Treasure of Code.<br />Coding Club, IIIT Vadodara.</span></div></aside>
        <section className="admin-shell login-shell">
          <header className="admin-header">
            <div>
              <p className="admin-eyebrow">AUTHORIZED KEEPERS ONLY</p>
              <h2>Admin login<span>.</span></h2>
              <p>Enter your credentials to manage the hunt.</p>
            </div>
          </header>

          {error && <div className="state-box error" id="admin-login-error" role="alert">{error}</div>}
          {successMessage && <div className="state-box success" role="status">{successMessage}</div>}

          <form className="login-form" onSubmit={handleLogin} aria-busy={isLoggingIn}>
            <label className="field-label" htmlFor="admin-username">
              Username
            </label>
            <input
              id="admin-username"
              className="field-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter admin username"
              autoComplete="username"
            />

            <label className="field-label" htmlFor="admin-password">
              Password
            </label>
            <div className="password-row">
              <input
                id="admin-password"
                className="field-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter admin password"
                autoComplete="current-password"
              />
              <button
                className="btn btn-secondary toggle-btn"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button className="btn btn-primary login-btn" disabled={isLoggingIn} type="submit">
              {isLoggingIn ? "Signing in..." : "Enter the control room →"}
            </button>
          </form>
          <p className="admin-login-note">CEREBRO · CODING CLUB, IIIT VADODARA</p>
        </section>
      </main>
    )
  }

  return <AdminLayout authToken={authToken} role={role || "admin"} onLogout={handleLogout} />
}

export default Admin
