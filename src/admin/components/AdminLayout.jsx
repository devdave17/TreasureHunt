import { useState } from "react"
import PropTypes from "prop-types"
import Sidebar from "./Sidebar"
import Dashboard from "./Dashboard"
import Users from "./Users"
import Questions from "./Questions"
import Stats from "./Stats"

function AdminLayout({ authToken, role, onLogout }) {
  const [activeTab, setActiveTab] = useState("dashboard")

  const resolvedRole = role === "invigilator" ? "invigilator" : "admin"

  const allowedTabs = resolvedRole === "invigilator"
    ? ["dashboard", "users"]
    : ["dashboard", "users", "questions", "stats"]

  const safeActiveTab = allowedTabs.includes(activeTab) ? activeTab : "dashboard"

  const renderContent = () => {
    switch (safeActiveTab) {
      case "dashboard":
        return <Dashboard authToken={authToken} role={resolvedRole} />
      case "users":
        return <Users authToken={authToken} role={resolvedRole} />
      case "questions":
        return <Questions authToken={authToken} />
      case "stats":
        return <Stats authToken={authToken} />
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
        {renderContent()}
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
