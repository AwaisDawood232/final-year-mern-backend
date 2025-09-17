const mongoose = require("mongoose");

const SwapRequestSchema = new mongoose.Schema({
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
  senderSkills: [{
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: String,
    level: String,
  }],
  receiverSkills: [{
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: String,
    level: String,
  }],
  message: {
    type: String,
    maxlength: [500, "Message cannot be more than 500 characters"],
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "cancelled", "completed"],
    default: "pending",
  },
  proposedSchedule: {
    days: [String],
    times: [{
      start: String,
      end: String,
    }],
    timezone: String,
    duration: Number,
    frequency: {
      type: String,
      enum: ["once", "weekly", "biweekly", "monthly"],
      default: "weekly",
    },
  },
  rejectionReason: String,
  acceptedAt: Date,
  rejectedAt: Date,
  cancelledAt: Date,
  completedAt: Date,
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    },
  },
  lastMessageAt: {
    type: Date,
  },
  sessions: [{
    date: Date,
    completed: {
      type: Boolean,
      default: false,
    },
    feedback: {
      rating: Number,
      comment: String,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

SwapRequestSchema.index({ sender: 1, status: 1 });
SwapRequestSchema.index({ receiver: 1, status: 1 });
SwapRequestSchema.index({ createdAt: -1 });
SwapRequestSchema.index({ expiresAt: 1 });

SwapRequestSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

SwapRequestSchema.methods.accept = function() {
  this.status = "accepted";
  this.acceptedAt = Date.now();
  return this.save();
};

SwapRequestSchema.methods.reject = function(reason) {
  this.status = "rejected";
  this.rejectedAt = Date.now();
  if (reason) {
    this.rejectionReason = reason;
  }
  return this.save();
};

SwapRequestSchema.methods.cancel = function() {
  this.status = "cancelled";
  this.cancelledAt = Date.now();
  return this.save();
};

SwapRequestSchema.methods.complete = function() {
  this.status = "completed";
  this.completedAt = Date.now();
  return this.save();
};

SwapRequestSchema.methods.isExpired = function() {
  return this.expiresAt < Date.now() && this.status === "pending";
};

SwapRequestSchema.statics.getRequestBetweenUsers = async function(userId1, userId2) {
  return this.findOne({
    $or: [
      { sender: userId1, receiver: userId2 },
      { sender: userId2, receiver: userId1 },
    ],
    status: { $in: ["pending", "accepted"] },
  });
};

module.exports = mongoose.model("SwapRequest", SwapRequestSchema);