import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 1 },
    { duration: "20s", target: 5 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost:5001";

export default function () {
  const response = http.get(`${baseUrl}/game/quests`);

  check(response, {
    "status is 200": (result) => result.status === 200,
    "response is JSON": (result) =>
      String(result.headers["Content-Type"] || "").includes("application/json"),
  });

  sleep(1);
}
