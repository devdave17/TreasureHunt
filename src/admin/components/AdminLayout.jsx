import { useState } from "react"
import PropTypes from "prop-types"
import Sidebar from "./Sidebar"
import Dashboard from "./Dashboard"
import Users from "./Users"
import Quests from "./Quests"
import Questions from "./Questions"
import Stats from "./Stats"
import Rankings from "./Rankings"

function AdminLayout({ authToken, role, onLogout }) {
  const [activeTab, setActiveTab] = useState("dashboard")

  const resolvedRole = role === "invigilator" ? "invigilator" : "admin"

  const allowedTabs = resolvedRole === "invigilator"
    ? ["dashboard", "users"]
    : ["dashboard", "users", "quests", "questions", "rankings", "stats"]

  const safeActiveTab = allowedTabs.includes(activeTab) ? activeTab : "dashboard"

  const renderContent = () => {
    switch (safeActiveTab) {
      case "dashboard":
        return <Dashboard authToken={authToken} role={resolvedRole} />
      case "users":
        return <Users authToken={authToken} role={resolvedRole} />
      case "quests":
        return <Quests authToken={authToken} />
      case "questions":
        return <Questions authToken={authToken} />
      case "stats":
        return <Stats authToken={authToken} />
      case "rankings":
        return <Rankings authToken={authToken} />
      default:
        return <Dashboard authToken={authToken} role={resolvedRole} />
    }
  }

  return (
    <div className="admin-layout">
      <Sidebar
        activeTab={safeActiveTab}
        onTabChange={setActiveTab}
        onLogout={onLogout}
        role={resolvedRole}
      />
      <main className="admin-main">
        <header className="admin-command-header"><div><span className="admin-eyebrow">TREASURE OF CODE / {safeActiveTab.toUpperCase()}</span><p>{({ dashboard: "Keep watch over the hunt.", users: "The souls behind the code.", quests: "Prepare the next descent.", questions: "Craft the clues. Guard the answers.", rankings: "Where the legends are recorded.", stats: "Read the signs in the numbers." })[safeActiveTab]}</p></div><span className="admin-role-chip">{resolvedRole === "invigilator" ? "Invigilator" : "Administrator"}</span></header>
        {renderContent()}
        <footer className="admin-page-footer">CEREBRO × Coding Club, IIIT Vadodara <span>THE CONTROL ROOM</span></footer>
      </main>
    </div>
  )
}

AdminLayout.propTypes = {
  authToken: PropTypes.string.isRequired,
  role: PropTypes.oneOf(["admin", "invigilator"]).isRequired,
  onLogout: PropTypes.func.isRequired
}

export default AdminLayout
