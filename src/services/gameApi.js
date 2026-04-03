const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const getAuthHeaders = (token) => ({
  "Content-Type": "application/json",
  "x-player-token": token,
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

export const gameApi = {
  async getQuestRanking(questId) {
    const response = await fetch(`${BASE_URL}/game/quests/${encodeURIComponent(questId)}/ranking`);

    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to fetch ranking");
    }

    return parseJsonSafe(response);
  },

  // Start timer for a question
  async startQuestionTimer(userId, level, questId, token) {
    console.log("[gameApi.startQuestionTimer] request", {
      userId,
      level,
      questId,
    });
    const response = await fetch(`${BASE_URL}/game/start-timer`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ userId, level, questId }),
    });

    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to start timer");
    }

    console.log("[gameApi.startQuestionTimer] response ok", {
      userId,
      level,
      questId,
    });

    return parseJsonSafe(response);
  },

  // Update user level and score after completing a question
  async updateProgress(userId, questId, questionId, level, points, token) {
    console.log("[gameApi.updateProgress] request", {
      userId,
      questId,
      questionId,
      level,
      points,
    });
    const response = await fetch(`${BASE_URL}/game/update-progress`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ userId, questId, questionId, level, points }),
    });

    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to update progress");
    }

    console.log("[gameApi.updateProgress] response ok", {
      userId,
      questId,
      questionId,
      level,
      points,
    });

    return parseJsonSafe(response);
  },

  // Get user progress
  async getUserProgress(userId, questId, token) {
    const query = questId ? `?questId=${encodeURIComponent(questId)}` : "";
    const response = await fetch(`${BASE_URL}/game/progress/${userId}${query}`, {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to get progress");
    }

    return parseJsonSafe(response);
  },

  // Submit question answer for a specific quest/question
  async submitAnswer(questId, questionId, answer, token) {
    console.log("[gameApi.submitAnswer] request", {
      questId,
      questionId,
      answer,
    });
    const response = await fetch(
      `${BASE_URL}/game/quests/${encodeURIComponent(questId)}/questions/${encodeURIComponent(questionId)}/validate`,
      {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ answer }),
    }
    );

    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to validate answer");
    }

    console.log("[gameApi.submitAnswer] response ok", {
      questId,
      questionId,
    });

    return parseJsonSafe(response);
  },

  // Get question details
  async getQuestion(questionId, token) {
    const response = await fetch(`${BASE_URL}/game/question/${questionId}`, {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to get question");
    }

    return parseJsonSafe(response);
  },
};
