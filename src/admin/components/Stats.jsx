import { useEffect, useState, useMemo } from "react"
import PropTypes from "prop-types"
import { api } from "../api.js"

function Stats({ authToken }) {
  const [users, setUsers] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError("")
        const [userData, questionData] = await Promise.all([
          api.getUsers(authToken),
          api.getQuestions(authToken).catch(() => []) // Questions endpoint might not exist yet
        ])
        setUsers(Array.isArray(userData) ? userData : [])
        setQuestions(Array.isArray(questionData) ? questionData : [])
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
    const levelStats = {}
    const difficultyStats = { Easy: 0, Medium: 0, Hard: 0 }

    users.forEach((user) => {
      const level = Number(user.currentLevel) || 0
      levelStats[level] = (levelStats[level] || 0) + 1
    })

    questions.forEach((q) => {
      const difficulty = q.difficulty || "Medium"
      if (difficultyStats.hasOwnProperty(difficulty)) {
        difficultyStats[difficulty]++
      }
    })

    return {
      totalQuestions: questions.length,
      difficultyStats,
      levelStats
    }
  }, [users, questions])

  return (
    <div className="module-container">
      <h2>Statistics</h2>

      {error && <div className="state-box error">{error}</div>}

      {loading ? (
        <div className="state-box">Loading statistics...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalQuestions}</div>
              <div className="stat-label">Total Questions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.difficultyStats.Easy}</div>
              <div className="stat-label">Easy Questions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.difficultyStats.Medium}</div>
              <div className="stat-label">Medium Questions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.difficultyStats.Hard}</div>
              <div className="stat-label">Hard Questions</div>
            </div>
          </div>

          <div className="stats-section">
            <h3>Questions by Difficulty</h3>
            <div className="difficulty-chart">
              {["Easy", "Medium", "Hard"].map((diff) => (
                <div key={diff} className="chart-item">
                  <div className="chart-label">{diff}</div>
                  <div className="chart-bar">
                    <div
                      className={`chart-fill difficulty-${diff.toLowerCase()}`}
                      style={{
                        width: `${
                          stats.totalQuestions > 0
                            ? (stats.difficultyStats[diff] / stats.totalQuestions) * 100
                            : 0
                        }%`
                      }}
                    />
                  </div>
                  <div className="chart-count">{stats.difficultyStats[diff]}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="stats-section">
            <h3>Levels with Most Users</h3>
            <div className="level-rankings">
              {Object.entries(stats.levelStats)
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .slice(0, 10)
                .map(([level, count]) => (
                  <div key={level} className="ranking-item">
                    <span className="ranking-label">Level {level}</span>
                    <div className="ranking-bar">
                      <div
                        className="ranking-fill"
                        style={{
                          width: `${
                            users.length > 0 ? (count / users.length) * 100 : 0
                          }%`
                        }}
                      />
                    </div>
                    <span className="ranking-count">{count} users</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

Stats.propTypes = {
  authToken: PropTypes.string.isRequired
}

export default Stats
