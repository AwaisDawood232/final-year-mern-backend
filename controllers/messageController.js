const Message = require("../models/messageModel");
const SwapRequest = require("../models/swapRequestModel");

exports.getConversationMessages = async (req, res) => {
  try {
    const { swapRequestId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    const userId = req.user.id;

    // Verify user is part of this swap request
    const swapRequest = await SwapRequest.findById(swapRequestId);

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: "Swap request not found",
      });
    }

    const isSender = swapRequest.sender.toString() === userId;
    const isReceiver = swapRequest.receiver.toString() === userId;

    if (!isSender && !isReceiver) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view these messages",
      });
    }

    // Get messages
    const messages = await Message.getConversation(
      swapRequestId,
      parseInt(limit),
      parseInt(skip)
    );

    // Mark messages as read
    await Message.markConversationAsRead(swapRequestId, userId);

    res.status(200).json({
      success: true,
      messages: messages.reverse(),
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { swapRequestId } = req.params;
    const { content, type = "text" } = req.body;
    const senderId = req.user.id;

    // Verify swap request and authorization
    const swapRequest = await SwapRequest.findById(swapRequestId);

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: "Swap request not found",
      });
    }

    if (swapRequest.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Messaging is only available for accepted swap requests",
      });
    }

    const isSender = swapRequest.sender.toString() === senderId;
    const isReceiver = swapRequest.receiver.toString() === senderId;

    if (!isSender && !isReceiver) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to send messages in this conversation",
      });
    }

    // Determine receiver
    const receiverId = isSender
      ? swapRequest.receiver.toString()
      : swapRequest.sender.toString();

    // Create message
    const message = await Message.create({
      swapRequest: swapRequestId,
      sender: senderId,
      receiver: receiverId,
      content,
      type,
    });

    // Populate sender and receiver info
    await message.populate("sender", "name avatar");
    await message.populate("receiver", "name avatar");

    // Update last message timestamp on swap request
    swapRequest.lastMessageAt = new Date();
    await swapRequest.save();

    res.status(201).json({
      success: true,
      message: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Message.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.receiver.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to mark this message as read",
      });
    }

    await message.markAsRead();

    res.status(200).json({
      success: true,
      message: "Message marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.markConversationAsRead = async (req, res) => {
  try {
    const { swapRequestId } = req.params;
    const userId = req.user.id;

    await Message.markConversationAsRead(swapRequestId, userId);

    res.status(200).json({
      success: true,
      message: "All messages marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getConversationList = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all accepted swap requests for the user
    const swapRequests = await SwapRequest.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: "accepted",
    })
      .populate("sender", "name avatar")
      .populate("receiver", "name avatar")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    // Get last message and unread count for each conversation
    const conversations = await Promise.all(
      swapRequests.map(async (request) => {
        const lastMessage = await Message.findOne({
          swapRequest: request._id,
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .populate("sender", "name");

        const unreadCount = await Message.countDocuments({
          swapRequest: request._id,
          receiver: userId,
          isRead: false,
          isDeleted: false,
        });

        const otherUser =
          request.sender._id.toString() === userId
            ? request.receiver
            : request.sender;

        return {
          swapRequestId: request._id,
          otherUser,
          lastMessage,
          unreadCount,
          lastMessageAt: request.lastMessageAt || request.updatedAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};