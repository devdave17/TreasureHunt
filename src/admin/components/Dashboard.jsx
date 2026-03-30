import { useEffect, useState, useMemo } from "react"
import PropTypes from "prop-types"
import { api } from "../api.js"

function Dashboard({ authToken }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError("")
        const userData = await api.getUsers(authToken)
        setUsers(Array.isArray(userData) ? userData : [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (authToken) {
      fetchData()
    }
  }, [authToken])

  const stats = useMemo(() => {
    const activeUsers = users.filter((u) => !u.isBlocked).length
    const blockedUsers = users.filter((u) => u.isBlocked).length
    const levelDistribution = {}

    users.forEach((user) => {
      const level = Number(user.currentLevel) || 0
      levelDistribution[level] = (levelDistribution[level] || 0) + 1
    })

    return {
      totalUsers: users.length,
      activeUsers,
      blockedUsers,
      levelDistribution
    }
  }, [users])

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>

      {error && <div className="state-box error">{error}</div>}

      {loading ? (
        <div className="state-box">Loading dashboard...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.activeUsers}</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.blockedUsers}</div>
              <div className="stat-label">Blocked Users</div>
            </div>
          </div>

          <div className="level-distribution">
            <h3>Users by Level</h3>
            <div className="dist-list">
              {Object.entries(stats.levelDistribution)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([level, count]) => (
                  <div key={level} className="dist-item">
                    <span className="dist-label">Level {level}</span>
                    <div className="dist-bar">
                      <div
                        className="dist-fill"
                        style={{
                          width: `${(count / Math.max(stats.totalUsers, 1)) * 100}%`
                        }}
                      />
                    </div>
                    <span className="dist-count">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

Dashboard.propTypes = {
  authToken: PropTypes.string.isRequired
}

export default Dashboard
