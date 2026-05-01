const express = require("express");
const router = express.Router();
const { 
    getNotificationsController, 
    markAsReadController, 
    deleteNotificationController,
    createNotificationController 
} = require("../controllers/notificationController/notification.Controller");
const { authMiddleware } = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Get all notifications for a user in a specific workspace
router.get("/v1/getNotifications/:workspaceId", getNotificationsController);

// Mark a specific notification as read
router.put("/v1/markAsRead/:notificationId", markAsReadController);

// Delete a specific notification
router.delete("/v1/deleteNotification/:notificationId", deleteNotificationController);

// Create a notification
router.post("/v1/createNotification", createNotificationController);

module.exports = router;
