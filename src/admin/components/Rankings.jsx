import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { api } from "../api.js"

const formatTimestamp = (value) => {
  if (!value) return "-"

  if (typeof value === "object" && value !== null) {
    if (typeof value.toDate === "function") {
      return value.toDate().toLocaleString()
    }

    if (typeof value.seconds === "number") {
      return new Date(value.seconds * 1000).toLocaleString()
    }
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

const formatSeconds = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "-"

  const total = Math.round(seconds)
  const hrs = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`
  }

  return `${mins}m ${String(secs).padStart(2, "0")}s`
}

function Rankings({ authToken }) {
  const [quests, setQuests] = useState([])
  const [selectedQuestId, setSelectedQuestId] = useState("")
  const [rankingData, setRankingData] = useState(null)
  const [selectedParticipant, setSelectedParticipant] = useState(null)
  const [loadingQuests, setLoadingQuests] = useState(false)
  const [loadingRanking, setLoadingRanking] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (authToken) {
      initializeQuests()
    }
  }, [authToken])
  
  const [linkCopied, setLinkCopied] = useState(false)

  const getRankingLink = () => {
    if (!selectedQuestId) return ""
    const origin = window.location.origin
    return `${origin}/ranking/${selectedQuestId}`
  }

  const copyLinkToClipboard = () => {
    const link = getRankingLink()
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
      })
    }
  }

  const openRankingPage = () => {
    const link = getRankingLink()
    if (link) {
      window.open(link, "_blank")
    }
  }

  useEffect(() => {
    if (selectedQuestId && authToken) {
      loadRanking(selectedQuestId)
    }
  }, [selectedQuestId, authToken])

  const initializeQuests = async () => {
    try {
      setLoadingQuests(true)
      setError("")

      const questList = await api.getQuests(authToken)
      const normalized = Array.isArray(questList) ? questList : []
      setQuests(normalized)

      if (normalized.length > 0) {
        setSelectedQuestId((prev) => prev || normalized[0].id)
      }
    } catch (err) {
      setError(err.message || "Failed to load quests")
    } finally {
      setLoadingQuests(false)
    }
  }

  const loadRanking = async (questId) => {
    try {
      setLoadingRanking(true)
      setError("")
      setSelectedParticipant(null)
      const payload = await api.getQuestRanking(questId, authToken)
      setRankingData(payload)
    } catch (err) {
      setError(err.message || "Failed to load ranking")
      setRankingData(null)
    } finally {
      setLoadingRanking(false)
    }
  }

  const selectedQuest = useMemo(
    () => quests.find((quest) => quest.id === selectedQuestId) || null,
    [quests, selectedQuestId],
  )

  const rankings = Array.isArray(rankingData?.rankings) ? rankingData.rankings : []
  const totalQuestions = Number(rankingData?.quest?.totalQuestions) || 0

  const completionRows = useMemo(() => {
    if (!selectedParticipant) return []

    const questionTimes = selectedParticipant.questionCompletionSeconds || {}

    return Object.entries(questionTimes)
      .map(([level, seconds]) => ({
        level: Number(level),
        seconds: Number(seconds) || 0,
      }))
      .filter((row) => Number.isFinite(row.level))
      .sort((a, b) => a.level - b.level)
  }, [selectedParticipant])

  return (
    <div className="module-container rankings-module">
      <div className="module-header">
        <h2>Quest Rankings</h2>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => selectedQuestId && loadRanking(selectedQuestId)}
          disabled={!selectedQuestId || loadingRanking}
        >
          {loadingRanking ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="state-box error">{error}</div>}

      <section className="form-section ranking-controls">
        <h3>Select Quest</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ranking-quest">Quest</label>
            <select
              id="ranking-quest"
              value={selectedQuestId}
              onChange={(event) => setSelectedQuestId(event.target.value)}
              disabled={loadingQuests || quests.length === 0}
            >
              {quests.length === 0 ? (
                <option value="">No quests available</option>
              ) : (
                quests.map((quest) => (
                  <option key={quest.id} value={quest.id}>
                    {quest.name || "Untitled Quest"} {quest.code ? `(${quest.code})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="form-group">
            <label>Quest Summary</label>
            <div className="state-box ranking-summary">
              {rankingData ? (
                <>
                  <strong>{rankingData.summary?.participantCount || 0}</strong> participants, <strong>{rankingData.summary?.completedCount || 0}</strong> with progress
                </>
              ) : selectedQuest ? (
                <>Choose a quest to view rankings</>
              ) : (
                <>No quest selected</>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="form-section ranking-link-section">
        <h3>📤 Shareable Link</h3>
        {selectedQuestId ? (
          <div className="ranking-link-box">
            <div className="ranking-link-input-group">
              <input
                type="text"
                readOnly
                value={getRankingLink()}
                className="ranking-link-input"
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={copyLinkToClipboard}
              >
                {linkCopied ? "✓ Copied!" : "Copy Link"}
              </button>
            </div>
            <button
              type="button"
              className="btn btn-success"
              onClick={openRankingPage}
            >
              👁️ View Ranking
            </button>
          </div>
        ) : (
          <div className="state-box">Select a quest to generate shareable link</div>
        )}
      </section>

      <section className="list-section">
        <h3>
          {rankingData?.quest?.name || selectedQuest?.name || "Rankings"}
          {totalQuestions > 0 ? ` (${totalQuestions} questions)` : ""}
        </h3>

        {loadingRanking ? (
          <div className="state-box">Loading ranking...</div>
        ) : rankings.length === 0 ? (
          <div className="state-box">No ranking data found for this quest yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="users-table ranking-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Score</th>
                  <th>Solved</th>
                  <th>Total Time</th>
                  <th>Current Level</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((row) => (
                  <tr
                    key={`${row.userId}-${row.progressId || row.rank}`}
                    onClick={() => setSelectedParticipant(row)}
                    className="ranking-row"
                  >
                    <td>#{row.rank}</td>
                    <td>{row.name || "Unknown player"}</td>
                    <td>{row.email || "-"}</td>
                    <td className="score-cell">{Number(row.totalScore) || 0}</td>
                    <td>
                      {Number(row.solvedQuestions) || 0}
                      {totalQuestions > 0 ? ` / ${totalQuestions}` : ""}
                    </td>
                    <td>{formatSeconds(Number(row.totalCompletionSeconds))}</td>
                    <td>{Number(row.currentLevel) || 0}</td>
                    <td>{formatTimestamp(row.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedParticipant && (
        <div className="ranking-modal-backdrop" onClick={() => setSelectedParticipant(null)}>
          <div className="ranking-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ranking-modal-header">
              <h3>Participant Details</h3>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedParticipant(null)}
              >
                Close
              </button>
            </div>

            <div className="ranking-modal-grid">
              <div className="ranking-info-card">
                <h4>Profile</h4>
                <p><strong>Name:</strong> {selectedParticipant.name || "Unknown player"}</p>
                <p><strong>Email:</strong> {selectedParticipant.email || "-"}</p>
                <p><strong>User ID:</strong> {selectedParticipant.userId || "-"}</p>
                <p><strong>Rank:</strong> #{selectedParticipant.rank}</p>
              </div>

              <div className="ranking-info-card">
                <h4>Progress</h4>
                <p><strong>Total Score:</strong> {Number(selectedParticipant.totalScore) || 0}</p>
                <p>
                  <strong>Solved Questions:</strong> {Number(selectedParticipant.solvedQuestions) || 0}
                  {totalQuestions > 0 ? ` / ${totalQuestions}` : ""}
                </p>
                <p><strong>Current Level:</strong> {Number(selectedParticipant.currentLevel) || 0}</p>
                <p><strong>Total Time:</strong> {formatSeconds(Number(selectedParticipant.totalCompletionSeconds))}</p>
              </div>

              <div className="ranking-info-card">
                <h4>Activity</h4>
                <p><strong>Quest Start:</strong> {formatTimestamp(selectedParticipant.questStartTime)}</p>
                <p><strong>Current Question Start:</strong> {formatTimestamp(selectedParticipant.questionStartTime)}</p>
                <p><strong>Last Active:</strong> {formatTimestamp(selectedParticipant.lastActive)}</p>
                <p><strong>Progress Updated:</strong> {formatTimestamp(selectedParticipant.progressUpdatedAt)}</p>
                {Number.isFinite(Number(selectedParticipant.totalElapsedSeconds)) && (
                  <p>
                    <strong>Elapsed (Wall Clock):</strong>{" "}
                    {formatSeconds(Number(selectedParticipant.totalElapsedSeconds))}
                  </p>
                )}
              </div>

              <div className="ranking-info-card">
                <h4>Completed Levels</h4>
                {Array.isArray(selectedParticipant.completedQuestionLevels) && selectedParticipant.completedQuestionLevels.length > 0 ? (
                  <div className="levels-passed">
                    {selectedParticipant.completedQuestionLevels.map((level) => (
                      <span key={`level-${selectedParticipant.userId}-${level}`} className="level-badge-simple">
                        L{level}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>No completed levels yet.</p>
                )}
              </div>
            </div>

            <div className="ranking-time-breakdown">
              <h4>Question Completion Time</h4>
              {completionRows.length === 0 ? (
                <p>No per-question completion timings available.</p>
              ) : (
                <div className="table-wrap">
                  <table className="users-table ranking-breakdown-table">
                    <thead>
                      <tr>
                        <th>Level</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completionRows.map((row) => (
                        <tr key={`completion-${selectedParticipant.userId}-${row.level}`}>
                          <td>L{row.level}</td>
                          <td>{formatSeconds(row.seconds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

Rankings.propTypes = {
  authToken: PropTypes.string.isRequired,
}

export default Rankings
