require("dotenv").config();

const { app, server, io } = require("./app"); // ✅ FIXED IMPORT
const { connectToMongo } = require("./db/mongo");
const { ensureMongoSchema } = require("./db/schemaSetup");
const setupRedis = require("./redisConfig/config.js");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log("🔍 Starting server initialization...");
    
    // DB setup
    console.log("📀 Connecting to MongoDB...");
    await connectToMongo();
    console.log("✅ MongoDB connected");
    
    console.log("📋 Ensuring MongoDB schema...");
    await ensureMongoSchema();
    console.log("✅ Schema ensured");

    // Redis setup (non-blocking)
    console.log("🔄 Setting up Redis...");
    const { pubClient } = await setupRedis(io);
    app.locals.pubClient = pubClient;
    if (pubClient) {
      console.log("✅ Redis setup complete");
    } else {
      console.log("⚠️  Redis unavailable - server will run in local mode");
    }

    // Socket logic
    console.log("🔌 Setting up Socket.IO...");
    require("./onlinePresence/workspacePresence.js")(io, pubClient);
    require("./sockets/notificationSocket.js")(io, pubClient);
    require("./sockets/updateSocket.js")(io, pubClient);
    console.log("✅ Socket.IO setup complete");
    // START ONLY ONE SERVER
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error.message || error);
    console.error(error);
    process.exit(1);
  }
}

startServer();