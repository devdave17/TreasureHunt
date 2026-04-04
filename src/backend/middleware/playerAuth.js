import jwt from "jsonwebtoken";

const getPlayerToken = (req) => {
  const bearerHeader = String(req.headers.authorization || "");
  if (bearerHeader.startsWith("Bearer ")) {
    return bearerHeader.slice("Bearer ".length).trim();
  }

  return String(req.headers["x-player-token"] || "").trim();
};

const getPlayerJwtSecret = () =>
  process.env.PLAYER_JWT_SECRET || process.env.PLAYER_MASTER_PASSWORD || "";

export const playerAuth = (req, res, next) => {
  const secret = getPlayerJwtSecret();
  if (!secret) {
    return res.status(503).json({
      error: "Player auth is not configured",
      details: "Set PLAYER_JWT_SECRET (or PLAYER_MASTER_PASSWORD fallback)",
    });
  }

  const token = getPlayerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Missing player token" });
  }

  try {
    const payload = jwt.verify(token, secret);
    if (payload?.type !== "player" || !payload?.sub) {
      return res.status(401).json({ error: "Invalid player token" });
    }

    req.playerId = String(payload.sub);
    req.playerTokenPayload = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired player token" });
  }
};
