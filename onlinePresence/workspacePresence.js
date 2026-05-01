module.exports = (io, pubClient) => {

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        socket.on("join", async (userId) => {

            await pubClient.set(`socket:${socket.id}`, userId);

            const connections = await pubClient.incr(`user:${userId}:connections`);

            await pubClient.sAdd("online_users", userId);

            console.log(userId, "ONLINE | connections:", connections);

            const count = await pubClient.sCard("online_users");
            io.emit("online_count", count);
        });

        socket.on("disconnect", async () => {

            const userId = await pubClient.get(`socket:${socket.id}`);
            if (!userId) return;

            const remaining = await pubClient.decr(`user:${userId}:connections`);

            if (remaining <= 0) {
                await pubClient.sRem("online_users", userId);
                await pubClient.del(`user:${userId}:connections`);
                console.log(userId, "OFFLINE");
            }

            await pubClient.del(`socket:${socket.id}`);

            const count = await pubClient.sCard("online_users");
            io.emit("online_count", count);
        });
    });
};