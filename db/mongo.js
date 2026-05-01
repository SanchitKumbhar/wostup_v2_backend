const mongoose = require("mongoose");

let connected = false;

async function connectToMongo() {
  if (connected) {
    return;
  }

  const mongoUri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || "startup_navigator";

  if (!mongoUri) {
    throw new Error("MONGO_URI is not set");
  }

  await mongoose.connect(mongoUri, { dbName });
  connected = true;
}

function getMongoConnection() {
  return mongoose.connection;
}

module.exports = {
  connectToMongo,
  getMongoConnection,
};
