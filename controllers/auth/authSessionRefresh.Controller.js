const AuthRefreshToken = require("../../models/authRefreshTokens.model");
const AuthSession = require("../../models/authSessions.model");
const async_handler = require("express-async-handler");
const crypto = require("crypto");
const { getUserById } = require("../../services/userService");

// Utility to hash tokens
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// 1. Create a new session and refresh token (for login or refresh)
const createSessionAndRefreshToken = async (userId, ipAddress, userAgent, expiresInMinutes = 43200) => {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const refreshToken = crypto.randomBytes(32).toString("hex");
  const sessionExpiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const session = await AuthSession.create({
    userId,
    sessionToken,
    ipAddress,
    userAgent,
    expiresAt: sessionExpiresAt,
  });

  const refresh = await AuthRefreshToken.create({
    userId,
    tokenHash: hashToken(refreshToken),
    sessionId: session._id,
    expiresAt: refreshExpiresAt,
  });

  return { sessionToken, refreshToken, session, refresh };
};

// 2. Refresh token handler
const refreshTokenHandler = async_handler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });
  const tokenHash = hashToken(refreshToken);
  const now = new Date();
  const tokenDoc = await AuthRefreshToken.findOne({ tokenHash, revokedAt: null, expiresAt: { $gt: now } });
  if (!tokenDoc) return res.status(401).json({ error: "Invalid or expired refresh token" });
  const user = await getUserById(tokenDoc.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  // Optionally rotate refresh token
  tokenDoc.revokedAt = new Date();
  await tokenDoc.save();
  const { refreshToken: newRefreshToken, sessionToken } = await createSessionAndRefreshToken(user.id, req.ip, req.headers["user-agent"]);
  res.status(200).json({ refreshToken: newRefreshToken, sessionToken });
});

// 3. Logout handler (revoke session and refresh token)
const logoutHandler = async_handler(async (req, res) => {
  const { sessionToken, refreshToken } = req.body;
  if (!sessionToken && !refreshToken) return res.status(400).json({ error: "Session or refresh token required" });
  if (sessionToken) {
    await AuthSession.updateOne({ sessionToken }, { $set: { revokedAt: new Date() } });
  }
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await AuthRefreshToken.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
  }
  res.status(200).json({ message: "Logged out" });
});

module.exports = {
  createSessionAndRefreshToken,
  refreshTokenHandler,
  logoutHandler,
};
