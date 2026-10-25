import PropTypes from "prop-types"
import OfficialLogo from "../../components/OfficialLogo"
import { RuneIcon } from "../../components/HauntSymbols"

function Sidebar({ activeTab, onTabChange, onLogout, role }) {
  const tabs = role === "invigilator"
    ? [
        { id: "dashboard", label: "Dashboard", icon: "📊" },
        { id: "users", label: "Users", icon: "👥" }
      ]
    : [
        { id: "dashboard", label: "Dashboard", icon: "📊" },
        { id: "users", label: "Users", icon: "👥" },
        { id: "quests", label: "Quests", icon: "🗓️" },
        { id: "questions", label: "Questions", icon: "❓" },
        { id: "rankings", label: "Rankings", icon: "🏁" },
        { id: "stats", label: "Stats", icon: "📈" }
      ]

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo"><OfficialLogo /></div>
        <div><span className="admin-eyebrow">CEREBRO</span><h1>The control room</h1></div>
      </div>

      <nav className="sidebar-nav" aria-label="Admin sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
            type="button"
            aria-current={activeTab === tab.id ? "page" : undefined}
            aria-label={tab.label}
            title={tab.label}
          >
            <span className="nav-icon"><RuneIcon name={{ dashboard: "chart", users: "users", quests: "flag", questions: "code", rankings: "treasure", stats: "chart" }[tab.id]} /></span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p className="admin-staff-label">{role === "invigilator" ? "INVIGILATOR ACCESS" : "KEEPER ACCESS · ADMIN"}</p>
        <button className="btn btn-logout" onClick={onLogout} type="button">
          <RuneIcon name="door" /> Log out
        </button>
      </div>
    </aside>
  )
}

Sidebar.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  role: PropTypes.oneOf(["admin", "invigilator"]).isRequired
}

export default Sidebar
