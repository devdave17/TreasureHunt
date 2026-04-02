import { useEffect, useState } from "react"
import PropTypes from "prop-types"
import { api } from "../api.js"
import {
  formatCountdownLabel,
  formatDateTimeLabel,
  getQuestDurationMinutes,
  getQuestLiveState
} from "../../utils/questTiming.js"

function Questions({ authToken }) {
  const [quests, setQuests] = useState([])
  const [selectedQuestId, setSelectedQuestId] = useState("")
  const [questions, setQuestions] = useState([])

  const [loading, setLoading] = useState(false)
  const [questLoading, setQuestLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [now, setNow] = useState(Date.now())

  const [formData, setFormData] = useState({
    level: "",
    title: "",
    riddleText: "",
    problemStatement: "",
    correctAnswer: "",
    difficulty: "Medium"
  })

  useEffect(() => {
    if (authToken) {
      initializeData()
    }
  }, [authToken])

  useEffect(() => {
    if (authToken && selectedQuestId) {
      fetchQuestions(selectedQuestId)
    } else {
      setQuestions([])
    }
  }, [authToken, selectedQuestId])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const initializeData = async () => {
    try {
      setQuestLoading(true)
      setError("")
      const data = await api.getQuests(authToken)
      const questList = Array.isArray(data) ? data : []
      setQuests(questList)

      if (questList.length > 0) {
        setSelectedQuestId(questList[0].id)
      }
    } catch (err) {
      setError(err.message || "Failed to load quests")
    } finally {
      setQuestLoading(false)
    }
  }

  const fetchQuestions = async (questId) => {
    try {
      setLoading(true)
      setError("")
      const data = await api.getQuestions(authToken, questId)
      setQuestions(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || "Failed to load questions")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setSuccessMessage("")

    if (!selectedQuestId) {
      setError("Select a quest first")
      return
    }

    if (!formData.level || !formData.title || !formData.correctAnswer) {
      setError("Level, Title, and Correct Answer are required")
      return
    }

    const payload = {
      ...formData,
      questId: selectedQuestId
    }

    try {
      setLoading(true)

      if (editingId) {
        await api.updateQuestion(editingId, payload, authToken)
        setSuccessMessage("Question updated successfully")
      } else {
        await api.addQuestion(payload, authToken)
        setSuccessMessage("Question added successfully")
      }

      resetForm()
      await fetchQuestions(selectedQuestId)
    } catch (err) {
      setError(err.message || "Failed to save question")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (question) => {
    if (question.questId) {
      setSelectedQuestId(question.questId)
    }

    setEditingId(question.id)
    setFormData({
      level: question.level || "",
      title: question.title || "",
      riddleText: question.riddleText || "",
      problemStatement: question.problemStatement || "",
      correctAnswer: question.correctAnswer || "",
      difficulty: question.difficulty || "Medium"
    })
  }

  const handleDelete = async (questionId) => {
    if (!window.confirm("Delete this question? This cannot be undone.")) {
      return
    }

    setDeletingId(questionId)
    setError("")
    setSuccessMessage("")

    try {
      await api.deleteQuestion(questionId, authToken)
      setQuestions((prev) => prev.filter((q) => q.id !== questionId))
      setSuccessMessage("Question deleted successfully")
    } catch (err) {
      setError(err.message || "Failed to delete question")
    } finally {
      setDeletingId(null)
    }
  }

  const resetForm = () => {
    setFormData({
      level: "",
      title: "",
      riddleText: "",
      problemStatement: "",
      correctAnswer: "",
      difficulty: "Medium"
    })
    setEditingId(null)
  }

  const selectedQuest = quests.find((quest) => quest.id === selectedQuestId) || null
  const selectedQuestLiveState = selectedQuest ? getQuestLiveState(selectedQuest, now) : null

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Question Management</h2>
        {editingId && (
          <button className="btn btn-secondary" onClick={resetForm} type="button">
            Cancel Edit
          </button>
        )}
      </div>

      {error && <div className="state-box error">{error}</div>}
      {successMessage && <div className="state-box success">{successMessage}</div>}

      <section className="form-section">
        <h3>Select Quest</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="quest-selector">Active Quest *</label>
            <select
              id="quest-selector"
              value={selectedQuestId}
              onChange={(event) => setSelectedQuestId(event.target.value)}
              disabled={questLoading || quests.length === 0}
            >
              {quests.length === 0 ? (
                <option value="">No quests found</option>
              ) : (
                quests.map((quest) => (
                  <option key={quest.id} value={quest.id}>
                    {quest.name}{quest.code ? ` (${quest.code})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </section>

      <section className="form-section">
        <h3>{editingId ? "Edit Question" : "Add Question To Selected Quest"}</h3>

        {!selectedQuest ? (
          <div className="state-box">Please create/select a quest before adding questions.</div>
        ) : (
          <>
            <div className="state-box">
              Selected Quest: <strong>{selectedQuest.name}</strong>
              {selectedQuest.code ? ` (${selectedQuest.code})` : ""}
              <br />
              Time Duration: <strong>{getQuestDurationMinutes(selectedQuest, 60)} minutes</strong>
              <br />
              Go Live At: <strong>{formatDateTimeLabel(selectedQuest.startAtMs)}</strong>
              <br />
              Status: <strong>{selectedQuestLiveState?.isLive ? "Live now" : `Opens in ${formatCountdownLabel(selectedQuestLiveState?.secondsUntilLive || 0)}`}</strong>
            </div>

            <form onSubmit={handleSubmit} className="question-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="level">Level *</label>
                  <input
                    id="level"
                    type="number"
                    name="level"
                    min="1"
                    value={formData.level}
                    onChange={handleInputChange}
                    placeholder="e.g., 1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="title">Title *</label>
                  <input
                    id="title"
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Question title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="difficulty">Difficulty</label>
                  <select
                    id="difficulty"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="riddleText">Riddle Text</label>
                <textarea
                  id="riddleText"
                  name="riddleText"
                  value={formData.riddleText}
                  onChange={handleInputChange}
                  placeholder="Enter riddle text"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="problemStatement">Problem Statement</label>
                <textarea
                  id="problemStatement"
                  name="problemStatement"
                  value={formData.problemStatement}
                  onChange={handleInputChange}
                  placeholder="Enter problem statement"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="correctAnswer">Correct Answer *</label>
                <input
                  id="correctAnswer"
                  type="text"
                  name="correctAnswer"
                  value={formData.correctAnswer}
                  onChange={handleInputChange}
                  placeholder="Correct answer"
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Saving..." : editingId ? "Update Question" : "Add Question"}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </section>

      <section className="list-section">
        <h3>
          {selectedQuest
            ? `Questions in ${selectedQuest.name} (${questions.length})`
            : "Questions (Select a quest)"}
        </h3>

        {!selectedQuest ? (
          <div className="state-box">Select a quest to view questions.</div>
        ) : loading ? (
          <div className="state-box">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="state-box">No questions in this quest yet.</div>
        ) : (
          <div className="questions-list">
            {questions.map((question) => (
              <div key={question.id} className="question-card">
                <div className="question-header">
                  <div>
                    <h4>{question.title}</h4>
                    <div className="question-meta">
                      <span className="badge badge-level">Level {question.level}</span>
                      <span className={`badge badge-difficulty badge-${question.difficulty?.toLowerCase()}`}>
                        {question.difficulty}
                      </span>
                    </div>
                  </div>
                  <div className="question-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleEdit(question)}
                      disabled={deletingId === question.id}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(question.id)}
                      disabled={deletingId === question.id}
                      type="button"
                    >
                      {deletingId === question.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>

                {question.riddleText && (
                  <div className="question-detail">
                    <strong>Riddle:</strong> {question.riddleText}
                  </div>
                )}

                {question.problemStatement && (
                  <div className="question-detail">
                    <strong>Problem:</strong> {question.problemStatement}
                  </div>
                )}

                <div className="question-detail answer-field">
                  <strong>Answer:</strong> <span className="answer-text">{question.correctAnswer}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

Questions.propTypes = {
  authToken: PropTypes.string.isRequired
}

export default Questions
