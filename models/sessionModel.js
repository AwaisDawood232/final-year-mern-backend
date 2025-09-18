const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    swapRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SwapRequest",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    location: {
      type: {
        type: String,
        enum: ["online", "in-person"],
        default: "online",
      },
      details: String, // Can be meeting link or physical address
      meetingPlatform: {
        type: String,
        enum: ["zoom", "google-meet", "teams", "skype", "other"],
      },
      meetingLink: String,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attendee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
    },
    attendeeConfirmed: {
      type: Boolean,
      default: false,
    },
    recurringPattern: {
      enabled: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "biweekly", "monthly"],
      },
      endDate: Date,
      exceptions: [Date], // Dates to skip in recurring pattern
    },
    reminders: [{
      time: Number, // Minutes before meeting
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: Date,
    }],
    notes: {
      beforeSession: String,
      afterSession: String,
    },
    feedback: {
      organizerRating: {
        type: Number,
        min: 1,
        max: 5,
      },
      attendeeRating: {
        type: Number,
        min: 1,
        max: 5,
      },
      organizerComment: String,
      attendeeComment: String,
    },
    calendarEventId: {
      google: String,
      outlook: String,
      ical: String,
    },
    cancellationReason: String,
    rescheduleHistory: [{
      oldStartTime: Date,
      oldEndTime: Date,
      changedAt: Date,
      changedBy: mongoose.Schema.Types.ObjectId,
      reason: String,
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
sessionSchema.index({ swapRequest: 1, startTime: 1 });
sessionSchema.index({ organizer: 1, status: 1 });
sessionSchema.index({ attendee: 1, status: 1 });
sessionSchema.index({ startTime: 1, status: 1 });

// Validate that end time is after start time
sessionSchema.pre("save", function (next) {
  if (this.endTime <= this.startTime) {
    next(new Error("End time must be after start time"));
  }
  next();
});

// Virtual for session duration in minutes
sessionSchema.virtual("duration").get(function () {
  return Math.round((this.endTime - this.startTime) / (1000 * 60));
});

// Method to check if session is upcoming
sessionSchema.methods.isUpcoming = function () {
  return this.startTime > new Date() && this.status === "scheduled";
};

// Method to check if session is past
sessionSchema.methods.isPast = function () {
  return this.endTime < new Date();
};

// Method to mark session as completed
sessionSchema.methods.markCompleted = async function () {
  this.status = "completed";
  return await this.save();
};

// Method to cancel session
sessionSchema.methods.cancel = async function (reason, userId) {
  this.status = "cancelled";
  this.cancellationReason = reason;
  return await this.save();
};

// Method to reschedule session
sessionSchema.methods.reschedule = async function (newStartTime, newEndTime, userId, reason) {
  this.rescheduleHistory.push({
    oldStartTime: this.startTime,
    oldEndTime: this.endTime,
    changedAt: new Date(),
    changedBy: userId,
    reason,
  });
  this.startTime = newStartTime;
  this.endTime = newEndTime;
  this.status = "rescheduled";
  this.attendeeConfirmed = false; // Require re-confirmation
  return await this.save();
};

// Static method to get upcoming sessions for a user
sessionSchema.statics.getUpcomingSessions = async function (userId, limit = 10) {
  return await this.find({
    $or: [{ organizer: userId }, { attendee: userId }],
    startTime: { $gt: new Date() },
    status: { $in: ["scheduled", "confirmed"] },
  })
    .populate("swapRequest")
    .populate("organizer", "name email avatar")
    .populate("attendee", "name email avatar")
    .sort({ startTime: 1 })
    .limit(limit);
};

// Static method to get past sessions for a user
sessionSchema.statics.getPastSessions = async function (userId, limit = 10) {
  return await this.find({
    $or: [{ organizer: userId }, { attendee: userId }],
    endTime: { $lt: new Date() },
    status: { $in: ["completed", "cancelled"] },
  })
    .populate("swapRequest")
    .populate("organizer", "name email avatar")
    .populate("attendee", "name email avatar")
    .sort({ startTime: -1 })
    .limit(limit);
};

// Static method to check for conflicts
sessionSchema.statics.hasConflict = async function (userId, startTime, endTime, excludeSessionId = null) {
  const query = {
    $or: [{ organizer: userId }, { attendee: userId }],
    status: { $in: ["scheduled", "confirmed"] },
    $or: [
      { startTime: { $gte: startTime, $lt: endTime } },
      { endTime: { $gt: startTime, $lte: endTime } },
      { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
    ],
  };

  if (excludeSessionId) {
    query._id = { $ne: excludeSessionId };
  }

  const conflicts = await this.find(query);
  return conflicts.length > 0;
};

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;