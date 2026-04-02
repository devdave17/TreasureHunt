import { useEffect, useState } from "react"
import PropTypes from "prop-types"
import { api } from "../api.js"
import {
  formatCountdownLabel,
  formatDateTimeLabel,
  getQuestDurationMinutes,
  getQuestLiveState,
  getQuestStartAtMs,
  toDateTimeLocalValue
} from "../../utils/questTiming.js"

const createQuestFormState = (quest = null) => ({
  name: quest?.name || "",
  code: quest?.code || "",
  description: quest?.description || "",
  durationMinutes: String(getQuestDurationMinutes(quest, 60)),
  startAt: toDateTimeLocalValue(getQuestStartAtMs(quest || {})),
  isActive: quest?.isActive !== false
})

function Quests({ authToken }) {
  const [quests, setQuests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [questForm, setQuestForm] = useState(createQuestFormState())

  useEffect(() => {
    if (authToken) {
      initializeData()
    }
  }, [authToken])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const initializeData = async () => {
    try {
      setLoading(true)
      setError("")
      const data = await api.getQuests(authToken)
      const questList = Array.isArray(data) ? data : []
      setQuests(questList)
    } catch (err) {
      setError(err.message || "Failed to load quests")
    } finally {
      setLoading(false)
    }
  }

  const handleQuestFormChange = (event) => {
    const { name, type, value, checked } = event.target
    setQuestForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setSuccessMessage("")

    const questName = questForm.name.trim()
    const questCode = questForm.code.trim().toUpperCase()
    const parsedDurationMinutes = Number(questForm.durationMinutes)
    const parsedStartAtMs = Number(new Date(questForm.startAt).getTime())

    if (!questName) {
      setError("Quest name is required")
      return
    }

    if (!Number.isInteger(parsedDurationMinutes) || parsedDurationMinutes < 1) {
      setError("Time duration must be a positive whole number")
      return
    }

    if (Number.isNaN(parsedStartAtMs)) {
      setError("Go live time is required")
      return
    }

    const payload = {
      name: questName,
      code: questCode,
      description: questForm.description.trim(),
      durationMinutes: parsedDurationMinutes,
      startAtMs: parsedStartAtMs,
      isActive: questForm.isActive
    }

    try {
      setLoading(true)

      if (editingId) {
        await api.updateQuest(editingId, payload, authToken)
        setSuccessMessage("Quest updated successfully")
      } else {
        await api.addQuest(payload, authToken)
        setSuccessMessage("Quest created successfully")
      }

      setEditingId(null)
      setQuestForm(createQuestFormState())
      await initializeData()
    } catch (err) {
      setError(err.message || "Failed to save quest")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (quest) => {
    setEditingId(quest.id)
    setQuestForm({
      name: quest.name || "",
      code: quest.code || "",
      description: quest.description || "",
      durationMinutes: String(getQuestDurationMinutes(quest, 60)),
      startAt: toDateTimeLocalValue(getQuestStartAtMs(quest)),
      isActive: quest.isActive !== false
    })
  }

  const handleDelete = async (questId) => {
    if (!window.confirm("Delete this quest and all of its questions? This cannot be undone.")) {
      return
    }

    setDeletingId(questId)
    setError("")
    setSuccessMessage("")

    try {
      await api.deleteQuest(questId, authToken)
      setQuests((prev) => prev.filter((quest) => quest.id !== questId))
      if (editingId === questId) {
        setEditingId(null)
        setQuestForm(createQuestFormState())
      }
      setSuccessMessage("Quest deleted successfully")
    } catch (err) {
      setError(err.message || "Failed to delete quest")
    } finally {
      setDeletingId(null)
    }
  }

  const resetForm = () => {
    setQuestForm(createQuestFormState())
    setEditingId(null)
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Quest Management</h2>
        {editingId && (
          <button className="btn btn-secondary" onClick={resetForm} type="button">
            Cancel Edit
          </button>
        )}
      </div>

      {error && <div className="state-box error">{error}</div>}
      {successMessage && <div className="state-box success">{successMessage}</div>}

      <section className="form-section">
        <h3>{editingId ? "Edit Quest" : "Create New Quest"}</h3>
        <form className="question-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quest-name">Quest Name *</label>
              <input
                id="quest-name"
                type="text"
                name="name"
                value={questForm.name}
                onChange={handleQuestFormChange}
                placeholder="e.g. Beginner Treasure Trail"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="quest-code">Quest Code</label>
              <input
                id="quest-code"
                type="text"
                name="code"
                value={questForm.code}
                onChange={handleQuestFormChange}
                placeholder="e.g. QUEST-01"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quest-duration">Duration (minutes) *</label>
              <input
                id="quest-duration"
                type="number"
                name="durationMinutes"
                min="1"
                step="1"
                value={questForm.durationMinutes}
                onChange={handleQuestFormChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="quest-start">Go Live At *</label>
              <input
                id="quest-start"
                type="datetime-local"
                name="startAt"
                value={questForm.startAt}
                onChange={handleQuestFormChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="quest-description">Description</label>
            <textarea
              id="quest-description"
              name="description"
              rows="3"
              value={questForm.description}
              onChange={handleQuestFormChange}
              placeholder="Short description for admins"
            />
          </div>

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label className="checkbox-label" htmlFor="quest-active">
                <input
                  id="quest-active"
                  type="checkbox"
                  name="isActive"
                  checked={questForm.isActive}
                  onChange={handleQuestFormChange}
                />
                Quest is active
              </label>
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <div className="state-box">
                The quest will appear on the player screen only when its go-live time is reached.
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : editingId ? "Update Quest" : "Create Quest"}
            </button>
          </div>
        </form>
      </section>

      <section className="list-section">
        <h3>Saved Quests ({quests.length})</h3>

        {loading && quests.length === 0 ? (
          <div className="state-box">Loading quests...</div>
        ) : quests.length === 0 ? (
          <div className="state-box">No quests found.</div>
        ) : (
          <div className="questions-list">
            {quests.map((quest) => {
              const liveState = getQuestLiveState(quest, now)

              return (
                <div key={quest.id} className="question-card">
                  <div className="question-header">
                    <div>
                      <h4>{quest.name}</h4>
                      <div className="question-meta">
                        <span className="badge badge-level">{quest.code || "No Code"}</span>
                        <span className={`badge ${liveState.isLive ? "badge-live" : "badge-pending"}`}>
                          {liveState.liveLabel}
                        </span>
                      </div>
                    </div>

                    <div className="question-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleEdit(quest)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(quest.id)}
                        disabled={deletingId === quest.id}
                        type="button"
                      >
                        {deletingId === quest.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  <div className="question-detail">
                    <strong>Go live:</strong> {formatDateTimeLabel(quest.startAtMs)}
                  </div>

                  <div className="question-detail">
                    <strong>Duration:</strong> {getQuestDurationMinutes(quest, 60)} minutes
                  </div>

                  <div className="question-detail">
                    <strong>Status:</strong>{" "}
                    {liveState.isLive
                      ? "Live now"
                      : `Opens in ${formatCountdownLabel(liveState.secondsUntilLive)}`}
                  </div>

                  {quest.description && (
                    <div className="question-detail">
                      <strong>Description:</strong> {quest.description}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

Quests.propTypes = {
  authToken: PropTypes.string.isRequired
}

export default Quests