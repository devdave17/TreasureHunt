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
  // Start timer for a question
  async startQuestionTimer(userId, level, questId, token) {
    const response = await fetch(`${BASE_URL}/game/start-timer`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ userId, level, questId }),
    });

    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to start timer");
    }

    return parseJsonSafe(response);
  },

  // Update user level and score after completing a question
  async updateProgress(userId, level, points, token) {
    const response = await fetch(`${BASE_URL}/game/update-progress`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ userId, level, points }),
    });

    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to update progress");
    }

    return parseJsonSafe(response);
  },

  // Get user progress
  async getUserProgress(userId, token) {
    const response = await fetch(`${BASE_URL}/game/progress/${userId}`, {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to get progress");
    }

    return parseJsonSafe(response);
  },

  // Submit question answer
  async submitAnswer(userId, questionId, answer, token) {
    const response = await fetch(`${BASE_URL}/game/submit-answer`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ userId, questionId, answer }),
    });

    if (!response.ok) {
      const error = await parseJsonSafe(response);
      throw new Error(error.error || "Failed to submit answer");
    }

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
