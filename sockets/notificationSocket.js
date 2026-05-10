const { createNotificationService, markNotificationAsReadService, deleteNotificationService } = require("../services/notificationService");
const { WorkspaceMember } = require("../models/index");

module.exports = (io, pubClient) => {
    io.on("connection", (socket) => {
        // expecting client to join via workspacePresence 'join' event first

        socket.on("send_notification", async (payload, callback) => {
            // payload: { workspaceId, recipientUserId OR recipientUserIds[], message, type }
            try {
                const { workspaceId, recipientUserId, recipientUserIds, message, type } = payload || {};
                const recipients = [];
                if (recipientUserIds && Array.isArray(recipientUserIds)) recipients.push(...recipientUserIds);
                if (recipientUserId) recipients.push(recipientUserId);

                const results = [];

                for (const rid of recipients) {
                    // validate recipient is member of the workspace
                    const member = await WorkspaceMember.findOne({ workspaceId, userId: rid });
                    if (!member) {
                        const msg = `Recipient ${rid} is not a member of workspace ${workspaceId}`;
                        results.push({ statuscode: 400, message: msg });
                        continue;
                    }

                    // persist notification
                    const res = await createNotificationService(workspaceId, rid, message, type);
                    results.push(res);

                    if (res.statuscode === 201) {
                        const notification = res.data;

                        // find sockets for this recipient across cluster and filter to those in this workspace
                        const sockets = await io.in(`user:${rid}`).fetchSockets();
                        const target = sockets.filter(s => s.rooms.has(`workspace:${workspaceId}`));

                        if (target.length > 0) {
                            // send to each matching socket
                            target.forEach(s => s.emit("notification", notification));
                        }
                        // if no sockets in this workspace, the notification is persisted and will be available
                        // when the user next connects; socket.io Redis adapter ensures delivery across servers
                    }
                }

                if (typeof callback === "function") callback({ statuscode: 200, results });
            } catch (err) {
                console.error("send_notification error", err);
                if (typeof callback === "function") callback({ statuscode: 500, message: err.message });
            }
        });

        socket.on("mark_notification_read", async ({ notificationId, recipientUserId }, callback) => {
            try {
                const res = await markNotificationAsReadService(notificationId, recipientUserId);
                if (res.statuscode === 200) {
                    // emit update to recipient sockets in same workspace(s)
                    const sockets = await io.in(`user:${recipientUserId}`).fetchSockets();
                    sockets.forEach(s => s.emit("notification_updated", res.data));
                }
                if (typeof callback === "function") callback(res);
            } catch (err) {
                console.error("mark_notification_read error", err);
                if (typeof callback === "function") callback({ statuscode: 500, message: err.message });
            }
        });

        socket.on("delete_notification", async ({ notificationId, recipientUserId }, callback) => {
            try {
                const res = await deleteNotificationService(notificationId, recipientUserId);
                if (res.statuscode === 200) {
                    const sockets = await io.in(`user:${recipientUserId}`).fetchSockets();
                    sockets.forEach(s => s.emit("notification_deleted", { notificationId }));
                }
                if (typeof callback === "function") callback(res);
            } catch (err) {
                console.error("delete_notification error", err);
                if (typeof callback === "function") callback({ statuscode: 500, message: err.message });
            }
        });
    });
};
