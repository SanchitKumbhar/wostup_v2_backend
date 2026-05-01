const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

async function setupRedis(io) {
    const pubClient = createClient({
        url: "redis://localhost:6379"
    });

    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    io.adapter(createAdapter(pubClient, subClient));

    console.log("✅ Redis connected");

    return { pubClient, subClient };
}

module.exports = setupRedis;