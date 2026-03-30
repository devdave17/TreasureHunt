import PropTypes from "prop-types"

function Sidebar({ activeTab, onTabChange, onLogout }) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "questions", label: "Questions", icon: "❓" },
    { id: "stats", label: "Stats", icon: "📈" }
  ]

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">🏆</div>
        <h1>Treasure Admin</h1>
      </div>

      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="btn btn-logout" onClick={onLogout} type="button">
          🚪 Logout
        </button>
      </div>
    </aside>
  )
}

Sidebar.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired
}

export default Sidebar
