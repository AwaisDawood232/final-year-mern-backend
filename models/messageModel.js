const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    swapRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SwapRequest",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxLength: 1000,
    },
    type: {
      type: String,
      enum: ["text", "emoji", "file", "system"],
      default: "text",
    },
    fileUrl: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    editedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
messageSchema.index({ swapRequest: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ isRead: 1, receiver: 1 });

// Virtual for checking if message is edited
messageSchema.virtual("isEdited").get(function () {
  return !!this.editedAt;
});

// Method to mark message as read
messageSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
};

// Static method to get conversation between users
messageSchema.statics.getConversation = async function (swapRequestId, limit = 50, skip = 0) {
  return await this.find({
    swapRequest: swapRequestId,
    isDeleted: false,
  })
    .populate("sender", "name avatar")
    .populate("receiver", "name avatar")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get unread count
messageSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({
    receiver: userId,
    isRead: false,
    isDeleted: false,
  });
};

// Static method to mark all messages as read in a conversation
messageSchema.statics.markConversationAsRead = async function (swapRequestId, userId) {
  return await this.updateMany(
    {
      swapRequest: swapRequestId,
      receiver: userId,
      isRead: false,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );
};

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;