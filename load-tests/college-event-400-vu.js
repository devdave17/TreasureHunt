/* global __ENV, __ITER, __VU */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

const baseUrl = (__ENV.BASE_URL || "http://localhost:5001").replace(/\/$/, "");
const questId = __ENV.QUEST_ID;
const questionId = __ENV.QUESTION_ID;
const testEmailDomain = __ENV.TEST_EMAIL_DOMAIN || "loadtest.invalid";
const testEmailPrefix = __ENV.TEST_EMAIL_PREFIX || "player";
const testPassword = __ENV.TEST_PASSWORD;
const answer = __ENV.TEST_ANSWER || "load-test-answer";

export const options = {
  scenarios: {
    college_event_spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 400 },
        { duration: "60s", target: 400 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500", "p(99)<3000"],
    login_rate_limited: ["count==0"],
    answer_rate_limited: ["count==0"],
    answer_duration: ["p(95)<1500"],
  },
};

const loginRateLimited = new Counter("login_rate_limited");
const answerRateLimited = new Counter("answer_rate_limited");
const answerDuration = new Trend("answer_duration");

const jsonHeaders = {
  "Content-Type": "application/json",
};

const requireConfiguration = () => {
  if (!questId || !testPassword) {
    throw new Error("QUEST_ID and TEST_PASSWORD are required");
  }
};

export function setup() {
  requireConfiguration();

  const response = http.get(`${baseUrl}/game/quests`);
  check(response, {
    "quest catalogue is available": (result) => result.status === 200,
  });

  if (response.status !== 200) {
    throw new Error(`Quest catalogue returned ${response.status}`);
  }

  return {
    questId,
    questionId,
  };
}

export default function (data) {
  if (__ITER > 0) {
    sleep(1);
    return;
  }

  const email = `${testEmailPrefix}${__VU}@${testEmailDomain}`;
  const loginResponse = http.post(
    `${baseUrl}/game/login`,
    JSON.stringify({ email, password: testPassword }),
    { headers: jsonHeaders },
  );

  const loginOk = check(loginResponse, {
    "player login is successful": (response) => response.status === 200,
    "login response is JSON": (response) =>
      String(response.headers["Content-Type"] || "").includes("application/json"),
  });

  if (loginResponse.status === 429) {
    loginRateLimited.add(1);
  }

  if (!loginOk) {
    sleep(1);
    return;
  }

  const loginPayload = loginResponse.json();
  const token = loginPayload?.token;
  const playerId = loginPayload?.player?.id;
  if (!token || !playerId) {
    throw new Error("Login response did not contain token and player id");
  }

  const questionsResponse = http.get(
    `${baseUrl}/game/quests/${encodeURIComponent(data.questId)}/questions`,
  );
  check(questionsResponse, {
    "quest questions are available": (response) => response.status === 200,
  });

  const questions = questionsResponse.status === 200 ? questionsResponse.json() : [];
  const selectedQuestionId =
    data.questionId || (Array.isArray(questions) ? questions[0]?.id : null);
  if (!selectedQuestionId) {
    throw new Error("QUESTION_ID is required when the quest has no public questions");
  }

  const answerStart = Date.now();
  const answerResponse = http.post(
    `${baseUrl}/game/quests/${encodeURIComponent(data.questId)}/questions/${encodeURIComponent(selectedQuestionId)}/validate`,
    JSON.stringify({ answer, userId: playerId }),
    {
      headers: {
        ...jsonHeaders,
        "x-player-token": token,
      },
    },
  );
  answerDuration.add(Date.now() - answerStart);

  check(answerResponse, {
    "answer request is accepted": (response) => response.status === 200,
    "answer response is JSON": (response) =>
      String(response.headers["Content-Type"] || "").includes("application/json"),
  });

  if (answerResponse.status === 429) {
    answerRateLimited.add(1);
  }

  sleep(1);
}
