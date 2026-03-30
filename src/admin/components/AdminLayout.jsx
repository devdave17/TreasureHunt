import { useState } from "react"
import PropTypes from "prop-types"
import Sidebar from "./Sidebar"
import Dashboard from "./Dashboard"
import Users from "./Users"
import Questions from "./Questions"
import Stats from "./Stats"

function AdminLayout({ authToken, onLogout }) {
  const [activeTab, setActiveTab] = useState("dashboard")

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard authToken={authToken} />
      case "users":
        return <Users authToken={authToken} />
      case "questions":
        return <Questions authToken={authToken} />
      case "stats":
        return <Stats authToken={authToken} />
      default:
        return <Dashboard authToken={authToken} />
    }
  }

  return (
    <div className="admin-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={onLogout} />
      <main className="admin-main">
        {renderContent()}
      </main>
    </div>
  )
}

AdminLayout.propTypes = {
  authToken: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired
}

export default AdminLayout
