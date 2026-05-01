const { extractToken, verifyToken } = require("../utils/jwt");

function authMiddleware(req, res, next) {
  const token = extractToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload || !payload.userId || !payload.email) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.auth = {
    userId: payload.userId,
    email: payload.email,
  };

  next();
}

module.exports = {
  authMiddleware,
};
