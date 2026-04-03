const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const getAuthHeaders = (token, role = "admin") => ({
  "Content-Type": "application/json",
  "x-admin-token": token,
  "x-admin-role": role,
});

const getReadHeaders = (token, role = "admin") => ({
  "x-admin-token": token,
  "x-admin-role": role,
});

const parseJsonSafe = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(
      text?.slice(0, 200) ||
        `Unexpected response from server (status ${response.status})`,
    );
  }
  return response.json();
};

export const api = {
  // Users endpoints
  async getUsers(token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/users`, {
      headers: getReadHeaders(token, role),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
  },

  async addUser(userData, token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/users`, {
      method: "POST",
      headers: getAuthHeaders(token, role),
      body: JSON.stringify(userData),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to add user");
    }
    return parseJsonSafe(response);
  },

  async blockUser(userId, isBlocked, token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/block`, {
      method: "POST",
      headers: getAuthHeaders(token, role),
      body: JSON.stringify({ userId, isBlocked }),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) throw new Error("Failed to update user status");
    return response.json();
  },

  async updateUserLevel(userId, level, points, token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/update-level`, {
      method: "POST",
      headers: getAuthHeaders(token, role),
      body: JSON.stringify({ userId, level, points }),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) throw new Error("Failed to update level");
    return response.json();
  },

  async deleteUser(userId, token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/users/${userId}`, {
      method: "DELETE",
      headers: getReadHeaders(token, role),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to delete user");
    }
    return parseJsonSafe(response);
  },

  async deleteAllUsers(token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/users`, {
      method: "DELETE",
      headers: getReadHeaders(token, role),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to delete all users");
    }
    return parseJsonSafe(response);
  },

  async bulkAddUsers(users, token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/users/bulk`, {
      method: "POST",
      headers: getAuthHeaders(token, role),
      body: JSON.stringify({ users }),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to import users");
    }
    return parseJsonSafe(response);
  },

  // Quests endpoints
  async getQuests(token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/quests`, {
      headers: getReadHeaders(token, role),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) throw new Error("Failed to fetch quests");
    return parseJsonSafe(response);
  },

  async addQuest(questData, token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/quests`, {
      method: "POST",
      headers: getAuthHeaders(token, role),
      body: JSON.stringify(questData),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to add quest");
    }
    const payload = await parseJsonSafe(response);
    return payload.quest || payload;
  },

  async updateQuest(questId, questData, token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/quests/${questId}`, {
      method: "PUT",
      headers: getAuthHeaders(token, role),
      body: JSON.stringify(questData),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to update quest");
    }
    return parseJsonSafe(response);
  },

  async deleteQuest(questId, token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/quests/${questId}`, {
      method: "DELETE",
      headers: getReadHeaders(token, role),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to delete quest");
    }
    return parseJsonSafe(response);
  },

  // Questions endpoints
  async getQuestions(token, questId = "", role = "admin") {
    const query = questId ? `?questId=${encodeURIComponent(questId)}` : "";
    const response = await fetch(`${BASE_URL}/admin/questions${query}`, {
      headers: getReadHeaders(token, role),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) throw new Error("Failed to fetch questions");
    return parseJsonSafe(response);
  },

  async addQuestion(questionData, token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/add-question`, {
      method: "POST",
      headers: getAuthHeaders(token, role),
      body: JSON.stringify(questionData),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to add question");
    }
    const payload = await parseJsonSafe(response);
    return payload.question || payload;
  },

  async updateQuestion(questionId, questionData, token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/questions/${questionId}`, {
      method: "PUT",
      headers: getAuthHeaders(token, role),
      body: JSON.stringify(questionData),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to update question");
    }
    return parseJsonSafe(response);
  },

  async deleteQuestion(questionId, token, role = "admin") {
    const response = await fetch(`${BASE_URL}/admin/questions/${questionId}`, {
      method: "DELETE",
      headers: getReadHeaders(token, role),
    });
    if (response.status === 401) throw new Error("Session expired");
    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to delete question");
    }
    return parseJsonSafe(response);
  },

  // Auth
  async login(username, password) {
    const response = await fetch(`${BASE_URL}/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Login failed");
    }
    return parseJsonSafe(response);
  },
};
