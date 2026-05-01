const { generateToken } = require("../utils/jwt");
const { comparePassword, createUser, getUserByEmail, getUserById } = require("./userService");
const { issueAndSendVerificationEmail } = require("./emailVerificationService");

async function register({ email, password, confirmPassword }) {
  if (!email || !password || !confirmPassword) {
    return { status: 400, body: { error: "Email, password, and confirmPassword are required" } };
  }

  if (password !== confirmPassword) {
    return { status: 400, body: { error: "Passwords do not match" } };
  }

  if (password.length < 6) {
    return { status: 400, body: { error: "Password must be at least 6 characters" } };
  }

  const name = String(email).split("@")[0] || "Team Member";

  try {
    const user = await createUser(email, name, password);
    const token = generateToken({ userId: user.id, email: user.email });
    let verificationEmailSent = true;

    try {
      await issueAndSendVerificationEmail(user);
    } catch (_emailError) {
      verificationEmailSent = false;
    }

    return {
      status: 201,
      body: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
        verificationEmailSent,
        warning: verificationEmailSent
          ? undefined
          : "Account created but verification email could not be sent",
      },
    };
  } catch (error) {
    if (error && error.message === "User already exists") {
      return { status: 400, body: { error: "Email already registered" } };
    }

    return { status: 500, body: { error: "Registration failed" } };
  }
}

async function login({ email, password }) {
  if (!email || !password) {
    return { status: 400, body: { error: "Email and password are required" } };
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return { status: 401, body: { error: "Invalid email or password" } };
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    return { status: 401, body: { error: "Invalid email or password" } };
  }

  const token = generateToken({ userId: user.id, email: user.email });

  return {
    status: 200,
    body: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
    },
  };
}

async function me(auth) {
  if (!auth || !auth.userId) {
    return { status: 401, body: { error: "Not authenticated" } };
  }

  const user = await getUserById(auth.userId);
  if (!user) {
    return { status: 404, body: { error: "User not found" } };
  }

  return {
    status: 200,
    body: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
    },
  };
}

module.exports = {
  register,
  login,
  me,
};
