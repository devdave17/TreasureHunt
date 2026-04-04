import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const buildLimiter = ({ windowMs, max, keyGenerator, label }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    message: {
      error: "Too many requests",
      code: "RATE_LIMITED",
      details: `Please retry later (${label}).`,
    },
  });

const ipKey = (req) => ipKeyGenerator(String(req.ip || req.socket?.remoteAddress || "unknown"));

const playerKey = (req) => {
  const playerId = String(req.playerId || "").trim();
  if (playerId) {
    return `player:${playerId}`;
  }

  return `ip:${ipKey(req)}`;
};

export const adminLoginLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: ipKey,
  label: "admin-login",
});

export const playerLoginLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: ipKey,
  label: "player-login",
});

export const validateAnswerLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: playerKey,
  label: "validate-answer",
});

export const updateProgressLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: playerKey,
  label: "update-progress",
});
