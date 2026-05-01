const authService = require("../../services/authService");

async function register(req, res) {
  const result = await authService.register(req.body || {});
  res.status(result.status).json(result.body);
}

async function login(req, res) {
  const result = await authService.login(req.body || {});
  res.status(result.status).json(result.body);
}

async function me(req, res) {
  try {
    const result = await authService.me(req.auth);
    res.status(result.status).json(result.body);
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
}

module.exports = {
  register,
  login,
  me,
};
