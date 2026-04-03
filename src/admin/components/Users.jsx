import { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { api } from "../api.js";

function Users({ authToken, role }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [blockingUserId, setBlockingUserId] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [deletingUserId, setDeletingUserId] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isImportingUsers, setIsImportingUsers] = useState(false);
  const [isDeletingAllUsers, setIsDeletingAllUsers] = useState(false);
  const [levelInputs, setLevelInputs] = useState({});
  const [jsonInput, setJsonInput] = useState("");
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    name: "",
    level: 1,
  });
  const [sortColumn, setSortColumn] = useState("score");
  const [sortDirection, setSortDirection] = useState("desc");

  const canManageUsers = role === "admin";
  const canBlockUsers = role === "admin" || role === "invigilator";

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getUsers(authToken, role);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchUsers();
    }
  }, [authToken, role]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedUsers = useMemo(() => {
    const sorted = [...users];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case "email":
          aValue = (a.email || "").toLowerCase();
          bValue = (b.email || "").toLowerCase();
          break;
        case "name":
          aValue = (a.name || "").toLowerCase();
          bValue = (b.name || "").toLowerCase();
          break;
        case "level":
          aValue = Number(a.currentLevel) || 0;
          bValue = Number(b.currentLevel) || 0;
          break;
        case "status":
          aValue = a.isBlocked ? 1 : 0;
          bValue = b.isBlocked ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [users, sortColumn, sortDirection]);

  const handleBlockToggle = async (userId, shouldBlock) => {
    setBlockingUserId(userId);
    setError("");
    setSuccessMessage("");

    try {
      await api.blockUser(userId, shouldBlock, authToken, role);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isBlocked: shouldBlock } : u,
        ),
      );
      setSuccessMessage(
        `User ${shouldBlock ? "blocked" : "unblocked"} successfully`,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBlockingUserId("");
    }
  };

  const handleLevelUpdate = async (
    userId,
    newLevel,
    currentLevel,
    points = 0,
  ) => {
    const parsedLevel = Number(newLevel);
    if (!Number.isInteger(parsedLevel) || parsedLevel < 1) {
      setError("Level must be a positive whole number");
      return;
    }
    if (parsedLevel === Number(currentLevel)) {
      return;
    }

    setUpdatingUserId(userId);
    setError("");
    setSuccessMessage("");

    try {
      await api.updateUserLevel(userId, parsedLevel, points, authToken, role);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                currentLevel: parsedLevel,
                score: u.score + points,
                completedLevels: u.completedLevels.some(
                  (c) => c.level === parsedLevel,
                )
                  ? u.completedLevels
                  : [
                      ...u.completedLevels,
                      {
                        level: parsedLevel,
                        completedAt: new Date(),
                        points: 20,
                      },
                    ],
              }
            : u,
        ),
      );
      setSuccessMessage(`Level updated successfully! +${points} points added`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingUserId("");
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Delete user ${email}? This cannot be undone.`)) {
      return;
    }

    setDeletingUserId(userId);
    setError("");
    setSuccessMessage("");

    try {
      await api.deleteUser(userId, authToken, role);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccessMessage("User deleted successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingUserId("");
    }
  };

  const handleSingleUserInputChange = (field, value) => {
    setNewUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSingleUser = async (event) => {
    event.preventDefault();
    const email = newUserForm.email.trim();
    const name = newUserForm.name.trim();
    const level = Number(newUserForm.level);

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!Number.isInteger(level) || level < 1) {
      setError("Level must be a positive whole number");
      return;
    }

    setIsAddingUser(true);
    setError("");
    setSuccessMessage("");

    try {
      await api.addUser({ email, name, level }, authToken, role);
      setSuccessMessage("User added successfully");
      setNewUserForm({ email: "", name: "", level: 1 });
      await fetchUsers();
    } catch (err) {
      setError(err.message || "Unable to add user");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleBulkImport = async () => {
    let parsed;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setError("Invalid JSON format");
      return;
    }

    const payloadUsers = Array.isArray(parsed) ? parsed : parsed?.users;
    if (!Array.isArray(payloadUsers) || payloadUsers.length === 0) {
      setError("Provide at least one user in JSON");
      return;
    }

    setIsImportingUsers(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await api.bulkAddUsers(payloadUsers, authToken, role);
      setSuccessMessage(
        `Imported ${data.created ?? 0} users. Skipped ${data.skippedDuplicate ?? 0} duplicate and ${data.skippedInvalid ?? 0} invalid.`,
      );
      setJsonInput("");
      await fetchUsers();
    } catch (err) {
      setError(err.message || "Unable to import users");
    } finally {
      setIsImportingUsers(false);
    }
  };

  const handleJsonFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      setJsonInput(raw);
      const parsed = JSON.parse(raw);
      const payloadUsers = Array.isArray(parsed) ? parsed : parsed?.users;
      if (!Array.isArray(payloadUsers) || payloadUsers.length === 0) {
        setError("Uploaded JSON has no users array");
        return;
      }
      setIsImportingUsers(true);
      setError("");
      setSuccessMessage("");
      const data = await api.bulkAddUsers(payloadUsers, authToken, role);
      setSuccessMessage(
        `Imported ${data.created ?? 0} users. Skipped ${data.skippedDuplicate ?? 0} duplicate and ${data.skippedInvalid ?? 0} invalid.`,
      );
      setJsonInput("");
      await fetchUsers();
    } catch {
      setError("Uploaded file does not contain valid JSON");
    } finally {
      setIsImportingUsers(false);
      event.target.value = "";
    }
  };

  const handleDeleteAllUsers = async () => {
    const confirmed = window.confirm(
      "Delete ALL users? This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }

    setIsDeletingAllUsers(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await api.deleteAllUsers(authToken, role);
      setUsers([]);
      setLevelInputs({});
      setSuccessMessage(`Deleted ${data.deleted ?? 0} users successfully`);
    } catch (err) {
      setError(err.message || "Unable to delete all users");
    } finally {
      setIsDeletingAllUsers(false);
    }
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Users Management</h2>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={fetchUsers}
            type="button"
            disabled={loading}
          >
            🔄 Refresh
          </button>
          {canManageUsers && (
            <button
              className="btn btn-danger"
              onClick={handleDeleteAllUsers}
              type="button"
              disabled={isDeletingAllUsers || users.length === 0}
            >
              {isDeletingAllUsers ? "Deleting..." : "Delete All"}
            </button>
          )}
        </div>
      </div>

      {canManageUsers && (
        <>
          <section className="form-section">
            <h3>Add Single User</h3>
            <form className="question-form" onSubmit={handleAddSingleUser}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="new-user-email">Email</label>
                  <input
                    id="new-user-email"
                    type="email"
                    value={newUserForm.email}
                    onChange={(event) =>
                      handleSingleUserInputChange("email", event.target.value)
                    }
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-user-name">Name</label>
                  <input
                    id="new-user-name"
                    type="text"
                    value={newUserForm.name}
                    onChange={(event) =>
                      handleSingleUserInputChange("name", event.target.value)
                    }
                    placeholder="User Name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-user-level">Level</label>
                  <input
                    id="new-user-level"
                    type="number"
                    min="1"
                    value={newUserForm.level}
                    onChange={(event) =>
                      handleSingleUserInputChange("level", event.target.value)
                    }
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={isAddingUser}
                >
                  {isAddingUser ? "Adding..." : "Add User"}
                </button>
              </div>
            </form>
          </section>

          <section className="import-panel">
            <div className="import-panel-top">
              <h2>Bulk Import Users</h2>
              <div className="import-actions">
                <label
                  className="btn btn-secondary file-btn"
                  htmlFor="users-json-upload"
                >
                  Upload JSON
                </label>
                <input
                  id="users-json-upload"
                  type="file"
                  accept="application/json,.json"
                  onChange={handleJsonFileUpload}
                  hidden
                />
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={isImportingUsers}
                  onClick={handleBulkImport}
                >
                  {isImportingUsers ? "Importing..." : "Import JSON"}
                </button>
              </div>
            </div>
            <textarea
              className="json-input"
              value={jsonInput}
              onChange={(event) => setJsonInput(event.target.value)}
              placeholder='Paste JSON array or {"users": [...]} here'
            />
          </section>
        </>
      )}

      {!canManageUsers && (
        <div className="state-box">
          Invigilator mode: you can monitor users and block/unblock suspicious
          activity.
        </div>
      )}

      {error && <div className="state-box error">{error}</div>}
      {successMessage && (
        <div className="state-box success">{successMessage}</div>
      )}

      {loading ? (
        <div className="state-box">Loading users...</div>
      ) : (
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Sr No</th>
                <th
                  className={`sortable ${sortColumn === "email" ? `sort-${sortDirection}` : ""}`}
                  onClick={() => handleSort("email")}
                >
                  Email{" "}
                  {sortColumn === "email" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className={`sortable ${sortColumn === "name" ? `sort-${sortDirection}` : ""}`}
                  onClick={() => handleSort("name")}
                >
                  Name{" "}
                  {sortColumn === "name" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className={`sortable ${sortColumn === "level" ? `sort-${sortDirection}` : ""}`}
                  onClick={() => handleSort("level")}
                >
                  Level{" "}
                  {sortColumn === "level" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className={`sortable ${sortColumn === "status" ? `sort-${sortDirection}` : ""}`}
                  onClick={() => handleSort("status")}
                >
                  Status{" "}
                  {sortColumn === "status" &&
                    (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th>Levels Passed</th>
                <th
                  className={`sortable ${sortColumn === "score" ? `sort-${sortDirection}` : ""}`}
                  onClick={() => handleSort("score")}
                >
                  Score{" "}
                  {sortColumn === "score" &&
                    (sortDirection === "desc" ? "▲" : "▼")}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-cell">
                    No users found
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user, idx) => {
                  const currentLevel = Number(user.currentLevel) || 1;
                  const isBusy =
                    blockingUserId === user.id ||
                    updatingUserId === user.id ||
                    deletingUserId === user.id;

                  return (
                    <tr key={user.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{user.email || "-"}</td>
                      <td>{user.name || "-"}</td>
                      <td>{currentLevel}</td>
                      <td>
                        <span
                          className={`status-pill ${user.isBlocked ? "blocked" : "active"}`}
                        >
                          {user.isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="levels-passed">
                          {Array.isArray(user.completedLevels) &&
                          user.completedLevels.length > 0
                            ? user.completedLevels
                                .sort(
                                  (a, b) => b.questionLevel - a.questionLevel,
                                ) // Sort descending
                                .map((completion, idx) => (
                                  <span
                                    key={idx}
                                    className="level-badge-simple"
                                  >
                                    L{completion.questionLevel}
                                  </span>
                                ))
                            : "None"}
                        </div>
                      </td>
                      <td className="score-cell">{user.score || 0}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className={`btn ${user.isBlocked ? "btn-success" : "btn-danger"}`}
                            onClick={() =>
                              handleBlockToggle(user.id, !user.isBlocked)
                            }
                            disabled={isBusy || !canBlockUsers}
                            type="button"
                          >
                            {blockingUserId === user.id
                              ? "..."
                              : user.isBlocked
                                ? "Unblock"
                                : "Block"}
                          </button>

                          {canManageUsers && (
                            <>
                              <input
                                type="number"
                                min="1"
                                className="level-input"
                                value={levelInputs[user.id] ?? currentLevel}
                                onChange={(e) =>
                                  setLevelInputs((prev) => ({
                                    ...prev,
                                    [user.id]: e.target.value,
                                  }))
                                }
                                disabled={isBusy}
                              />

                              <button
                                className="btn btn-primary"
                                onClick={() =>
                                  handleLevelUpdate(
                                    user.id,
                                    levelInputs[user.id] ?? currentLevel,
                                    currentLevel,
                                  )
                                }
                                disabled={isBusy}
                                type="button"
                              >
                                {updatingUserId === user.id ? "..." : "Save"}
                              </button>

                              <button
                                className="btn btn-danger"
                                onClick={() =>
                                  handleDeleteUser(user.id, user.email)
                                }
                                disabled={isBusy}
                                type="button"
                              >
                                {deletingUserId === user.id ? "..." : "Delete"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

Users.propTypes = {
  authToken: PropTypes.string.isRequired,
  role: PropTypes.oneOf(["admin", "invigilator"]).isRequired,
};

export default Users;
