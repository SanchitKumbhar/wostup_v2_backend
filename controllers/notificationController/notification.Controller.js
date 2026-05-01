const async_handler = require("express-async-handler");
const NotificationService = require("../../services/notificationService");

const getNotificationsController = async_handler(async (req, res) => {
    const { workspaceId } = req.params;
    const recipientUserId = req.auth.userId;

    if (!workspaceId) {
        return res.status(400).json({ message: "Workspace ID not provided" });
    }

    const { statuscode, data, message } = await NotificationService.getNotificationsByUserService(
        workspaceId,
        recipientUserId
    );

    if (statuscode === 200) {
        return res.status(200).json(data);
    }

    return res.status(statuscode || 500).json({ message: message || "Could not fetch notifications" });
});

const markAsReadController = async_handler(async (req, res) => {
    const { notificationId } = req.params;
    const recipientUserId = req.auth.userId;

    if (!notificationId) {
        return res.status(400).json({ message: "Notification ID not provided" });
    }

    const { statuscode, data, message } = await NotificationService.markNotificationAsReadService(
        notificationId,
        recipientUserId
    );

    if (statuscode === 200) {
        return res.status(200).json(data);
    }

    return res.status(statuscode || 500).json({ message: message || "Could not mark notification as read" });
});

const deleteNotificationController = async_handler(async (req, res) => {
    const { notificationId } = req.params;
    const recipientUserId = req.auth.userId;

    if (!notificationId) {
        return res.status(400).json({ message: "Notification ID not provided" });
    }

    const { statuscode, message } = await NotificationService.deleteNotificationService(
        notificationId,
        recipientUserId
    );

    if (statuscode === 200) {
        return res.status(200).json({ message });
    }

    return res.status(statuscode || 500).json({ message: message || "Could not delete notification" });
});

const createNotificationController = async_handler(async (req, res) => {
    const { workspaceId, recipientUserId, message, type } = req.body;

    if (!workspaceId || !recipientUserId || !message || !type) {
        return res.status(400).json({ message: "Parameters not provided" });
    }

    const { statuscode, data, message: serviceMessage } = await NotificationService.createNotificationService(
        workspaceId,
        recipientUserId,
        message,
        type
    );

    if (statuscode === 201) {
        return res.status(201).json(data);
    }

    return res.status(statuscode || 500).json({ message: serviceMessage || "Could not create notification" });
});

module.exports = {
    getNotificationsController,
    markAsReadController,
    deleteNotificationController,
    createNotificationController
};
