const jwt = require("jsonwebtoken");
const Message = require("../models/messageModel");
const SwapRequest = require("../models/swapRequestModel");
const User = require("../models/userModel");

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
};

module.exports = (io) => {
  // Authentication middleware
  io.use(socketAuth);

  // Store active connections
  const activeUsers = new Map();

  io.on("connection", (socket) => {
    console.log(`User ${socket.user.name} connected`);

    // Add user to active users
    activeUsers.set(socket.userId, socket.id);

    // Join user to their own room
    socket.join(socket.userId);

    // Send online status to all connected users
    socket.broadcast.emit("user_online", socket.userId);

    // Join swap request rooms for active conversations
    socket.on("join_conversation", async (swapRequestId) => {
      try {
        // Verify user is part of this swap request
        const swapRequest = await SwapRequest.findById(swapRequestId);

        if (!swapRequest) {
          socket.emit("error", { message: "Swap request not found" });
          return;
        }

        const isSender = swapRequest.sender.toString() === socket.userId;
        const isReceiver = swapRequest.receiver.toString() === socket.userId;

        if (!isSender && !isReceiver) {
          socket.emit("error", { message: "Unauthorized" });
          return;
        }

        // Only allow messaging if request is accepted
        if (swapRequest.status !== "accepted") {
          socket.emit("error", { message: "Messaging is only available for accepted swap requests" });
          return;
        }

        // Join the conversation room
        socket.join(`swap_${swapRequestId}`);

        // Load previous messages
        const messages = await Message.getConversation(swapRequestId, 50);
        socket.emit("previous_messages", messages.reverse());

        // Mark messages as read
        await Message.markConversationAsRead(swapRequestId, socket.userId);

        socket.emit("joined_conversation", { swapRequestId });
      } catch (error) {
        console.error("Error joining conversation:", error);
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });

    // Leave conversation room
    socket.on("leave_conversation", (swapRequestId) => {
      socket.leave(`swap_${swapRequestId}`);
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const { swapRequestId, content, type = "text" } = data;

        // Verify swap request and authorization
        const swapRequest = await SwapRequest.findById(swapRequestId)
          .populate("sender", "name avatar")
          .populate("receiver", "name avatar");

        if (!swapRequest || swapRequest.status !== "accepted") {
          socket.emit("error", { message: "Cannot send message" });
          return;
        }

        const isSender = swapRequest.sender._id.toString() === socket.userId;
        const isReceiver = swapRequest.receiver._id.toString() === socket.userId;

        if (!isSender && !isReceiver) {
          socket.emit("error", { message: "Unauthorized" });
          return;
        }

        // Determine receiver
        const receiverId = isSender
          ? swapRequest.receiver._id.toString()
          : swapRequest.sender._id.toString();

        // Create message
        const message = await Message.create({
          swapRequest: swapRequestId,
          sender: socket.userId,
          receiver: receiverId,
          content,
          type,
        });

        // Populate sender and receiver info
        await message.populate("sender", "name avatar");
        await message.populate("receiver", "name avatar");

        // Emit message to conversation room
        io.to(`swap_${swapRequestId}`).emit("new_message", message);

        // Send notification to receiver if they're online but not in the conversation
        const receiverSocketId = activeUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("message_notification", {
            swapRequestId,
            message,
            senderName: socket.user.name,
          });
        }

        // Update last message timestamp on swap request
        swapRequest.lastMessageAt = new Date();
        await swapRequest.save();

      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing indicators
    socket.on("typing", ({ swapRequestId, isTyping }) => {
      socket.to(`swap_${swapRequestId}`).emit("user_typing", {
        userId: socket.userId,
        userName: socket.user.name,
        isTyping,
      });
    });

    // Mark message as read
    socket.on("mark_read", async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (message && message.receiver.toString() === socket.userId) {
          await message.markAsRead();

          // Notify sender that message was read
          const senderSocketId = activeUsers.get(message.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit("message_read", {
              messageId,
              readAt: message.readAt,
            });
          }
        }
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    });

    // Mark all messages in conversation as read
    socket.on("mark_conversation_read", async ({ swapRequestId }) => {
      try {
        await Message.markConversationAsRead(swapRequestId, socket.userId);
        socket.emit("conversation_marked_read", { swapRequestId });
      } catch (error) {
        console.error("Error marking conversation as read:", error);
      }
    });

    // Get unread message count
    socket.on("get_unread_count", async () => {
      try {
        const count = await Message.getUnreadCount(socket.userId);
        socket.emit("unread_count", count);
      } catch (error) {
        console.error("Error getting unread count:", error);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User ${socket.user.name} disconnected`);

      // Remove from active users
      activeUsers.delete(socket.userId);

      // Notify others that user is offline
      socket.broadcast.emit("user_offline", socket.userId);
    });
  });
};