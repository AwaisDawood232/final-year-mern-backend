const express = require("express");
const {
  getConversationMessages,
  sendMessage,
  getUnreadCount,
  markMessageAsRead,
  markConversationAsRead,
  getConversationList,
} = require("../controllers/messageController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all conversations for user
router.get("/conversations", getConversationList);

// Get unread message count
router.get("/unread-count", getUnreadCount);

// Get messages for a specific conversation
router.get("/conversation/:swapRequestId", getConversationMessages);

// Send message in a conversation
router.post("/conversation/:swapRequestId", sendMessage);

// Mark single message as read
router.put("/read/:messageId", markMessageAsRead);

// Mark all messages in conversation as read
router.put("/conversation/:swapRequestId/read-all", markConversationAsRead);

module.exports = router;