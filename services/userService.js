const bcryptjs = require("bcryptjs");
const mongoose = require("mongoose");
const { User, AuthAccount } = require("../models");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function hashPassword(password) {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

async function comparePassword(password, hashedPassword) {
  if (!hashedPassword) {
    return false;
  }

  return bcryptjs.compare(password, hashedPassword);
}

async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  const userDoc = await User.findOne({
    email: normalizedEmail,
    isActive: true,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).lean();

  if (!userDoc) {
    return undefined;
  }

  const accountDoc = await AuthAccount.findOne({
    userId: userDoc._id,
    provider: "local",
  }).lean();

  if (!accountDoc || !accountDoc.passwordHash) {
    return undefined;
  }

  return {
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name,
    emailVerified: Boolean(userDoc.emailVerified),
    password: accountDoc.passwordHash,
  };
}

async function getUserById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return undefined;
  }

  const userDoc = await User.findById(id).lean();
  if (!userDoc || !userDoc.isActive || userDoc.deletedAt) {
    return undefined;
  }

  return {
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name,
    emailVerified: Boolean(userDoc.emailVerified),
    password: "",
  };
}

async function createUser(email, name, password) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await hashPassword(password);
  const safeName = String(name || "").trim() || "Team Member";
  const avatar = (safeName.charAt(0) || normalizedEmail.charAt(0) || "U").toUpperCase();

  const createdUser = await User.create({
    name: safeName,
    email: normalizedEmail,
    avatar,
    skills: [],
    isActive: true,
  });

  await AuthAccount.create({
    userId: createdUser._id,
    provider: "local",
    providerAccountId: normalizedEmail,
    passwordHash: hashedPassword,
    passwordAlgo: "bcrypt",
  });

  return {
    id: createdUser._id.toString(),
    email: createdUser.email,
    name: createdUser.name,
    emailVerified: Boolean(createdUser.emailVerified),
    password: hashedPassword,
  };
}

async function getAllUsers() {
  const userDocs = await User.find({
    isActive: true,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).lean();

  return userDocs.map((userDoc) => ({
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name,
    emailVerified: Boolean(userDoc.emailVerified),
    password: "",
  }));
}

module.exports = {
  hashPassword,
  comparePassword,
  getUserByEmail,
  getUserById,
  createUser,
  getAllUsers,
};
