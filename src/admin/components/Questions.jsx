import { useEffect, useState } from "react"
import PropTypes from "prop-types"
import { api } from "../api.js"

function Questions({ authToken }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

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
      fetchQuestions()
    }
  }, [authToken])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      setError("")
      const data = await api.getQuestions(authToken)
      setQuestions(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || "Failed to load questions")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")

    if (!formData.level || !formData.title || !formData.correctAnswer) {
      setError("Level, Title, and Correct Answer are required")
      return
    }

    try {
      setLoading(true)

      if (editingId) {
        await api.updateQuestion(editingId, formData, authToken)
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingId ? { ...q, ...formData } : q))
        )
        setSuccessMessage("Question updated successfully")
      } else {
        const newQuestion = await api.addQuestion(formData, authToken)
        setQuestions((prev) => [...prev, newQuestion])
        setSuccessMessage("Question added successfully")
      }

      resetForm()
      fetchQuestions()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (question) => {
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
      setError(err.message)
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

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Question Management</h2>
        {editingId && (
          <button className="btn btn-secondary" onClick={resetForm} type="button">
            ✕ Cancel Edit
          </button>
        )}
      </div>

      {error && <div className="state-box error">{error}</div>}
      {successMessage && <div className="state-box success">{successMessage}</div>}

      {/* Question Form */}
      <div className="form-section">
        <h3>{editingId ? "Edit Question" : "Add New Question"}</h3>

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
              placeholder="Enter riddle text if applicable"
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
              placeholder="Correct answer (hidden from users)"
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
      </div>

      {/* Questions List */}
      <div className="list-section">
        <h3>All Questions ({questions.length})</h3>

        {questions.length === 0 ? (
          <div className="state-box">No questions yet. Add one to get started!</div>
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
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(question.id)}
                      disabled={deletingId === question.id}
                      type="button"
                    >
                      {deletingId === question.id ? "..." : "🗑️ Delete"}
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
                  <strong>✓ Answer:</strong> <span className="answer-text">{question.correctAnswer}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

Questions.propTypes = {
  authToken: PropTypes.string.isRequired
}

export default Questions
