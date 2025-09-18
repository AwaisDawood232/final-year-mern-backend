const mongoose = require("mongoose");
const Session = require("../models/sessionModel");
const SwapRequest = require("../models/swapRequestModel");
const User = require("../models/userModel");
// Email service imports removed - can be added when email service is configured
// const { sendCalendarInvite, generateMeetingLink } = require("../services/calendarService");

// Create a new session
exports.createSession = async (req, res) => {
  try {
    const organizerId = req.user.id;
    const {
      swapRequestId,
      title,
      description,
      startTime,
      endTime,
      timezone,
      location,
      reminders,
      recurringPattern,
    } = req.body;

    // Verify swap request exists and user is part of it
    const swapRequest = await SwapRequest.findById(swapRequestId)
      .populate("sender", "name email")
      .populate("receiver", "name email");

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: "Swap request not found",
      });
    }

    if (swapRequest.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Can only schedule sessions for accepted swap requests",
      });
    }

    const isSender = swapRequest.sender._id.toString() === organizerId;
    const isReceiver = swapRequest.receiver._id.toString() === organizerId;

    if (!isSender && !isReceiver) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to schedule this session",
      });
    }

    // Determine attendee
    const attendeeId = isSender
      ? swapRequest.receiver._id.toString()
      : swapRequest.sender._id.toString();

    // Check for scheduling conflicts
    const hasConflict = await Session.hasConflict(
      organizerId,
      new Date(startTime),
      new Date(endTime)
    );

    if (hasConflict) {
      return res.status(400).json({
        success: false,
        message: "You have a scheduling conflict at this time",
      });
    }

    // Use provided meeting link or keep empty
    let meetingLink = location?.meetingLink || "";

    // Create session
    const session = await Session.create({
      swapRequest: swapRequestId,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      timezone: timezone || "UTC",
      location: {
        type: location?.type || "online",
        meetingPlatform: location?.meetingPlatform || null,
        meetingLink: meetingLink,
        details: location?.details || ""
      },
      organizer: organizerId,
      attendee: attendeeId,
      reminders: reminders || [{ time: 60 }, { time: 15 }], // Default: 1 hour and 15 minutes before
      recurringPattern,
    });

    // Populate session data
    await session.populate("organizer", "name email avatar");
    await session.populate("attendee", "name email avatar");
    await session.populate("swapRequest");

    // Calendar invite removed - can be added later if email service is configured
    // try {
    //   const organizer = isSender ? swapRequest.sender : swapRequest.receiver;
    //   const attendee = isSender ? swapRequest.receiver : swapRequest.sender;
    //   await sendCalendarInvite(session, organizer, attendee, "create");
    // } catch (emailError) {
    //   console.error("Failed to send calendar invite:", emailError);
    // }

    // Send session invite as a message in the chat
    try {
      const Message = require("../models/messageModel");

      // Create a session invite message
      const inviteMessage = await Message.create({
        swapRequest: swapRequestId,
        sender: req.user.id,
        receiver: req.user.id === swapRequest.sender.toString()
          ? swapRequest.receiver.toString()
          : swapRequest.sender.toString(),
        content: `Session scheduled: ${session.title}`,
        type: "session_invite",
        sessionId: session._id,
      });

      // Populate the message
      await inviteMessage.populate("sender", "name avatar");
      await inviteMessage.populate("receiver", "name avatar");
      await inviteMessage.populate({
        path: "sessionId",
        populate: [
          { path: "organizer", select: "name email avatar" },
          { path: "attendee", select: "name email avatar" }
        ]
      });

      // Emit the message through socket if available
      try {
        const io = req.app.get("io");
        if (io) {
          io.to(`swap_${swapRequestId}`).emit("new_message", inviteMessage);
        }
      } catch (socketError) {
        console.log("Socket notification skipped:", socketError.message);
      }

      // Update last message timestamp on swap request
      swapRequest.lastMessageAt = new Date();
      await swapRequest.save();
    } catch (messageError) {
      console.error("Failed to send session invite message:", messageError);
      // Don't fail the request if message sending fails
    }

    res.status(201).json({
      success: true,
      message: "Session scheduled successfully",
      session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all sessions for current user
exports.getMySessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, timeframe, swapRequestId } = req.query;

    let query = {
      $or: [{ organizer: userId }, { attendee: userId }],
    };

    // If swapRequestId is provided, filter by it
    if (swapRequestId) {
      query.swapRequest = swapRequestId;
    }

    if (status) {
      query.status = status;
    }

    if (timeframe === "upcoming") {
      query.startTime = { $gt: new Date() };
      query.status = { $in: ["scheduled", "confirmed"] };
    } else if (timeframe === "past") {
      query.endTime = { $lt: new Date() };
    }

    const sessions = await Session.find(query)
      .populate("swapRequest")
      .populate("organizer", "name email avatar")
      .populate("attendee", "name email avatar")
      .sort({ startTime: timeframe === "past" ? -1 : 1 });

    res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get session by ID
exports.getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id)
      .populate("swapRequest")
      .populate("organizer", "name email avatar bio")
      .populate("attendee", "name email avatar bio");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Verify user is part of this session
    if (
      session.organizer._id.toString() !== userId &&
      session.attendee._id.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this session",
      });
    }

    res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update/reschedule session
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { startTime, endTime, title, description, location, reason } = req.body;

    const session = await Session.findById(id)
      .populate("organizer", "name email")
      .populate("attendee", "name email");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Only organizer can update
    if (session.organizer._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the organizer can update this session",
      });
    }

    // Check for conflicts if time is changing
    if (startTime || endTime) {
      const newStartTime = startTime ? new Date(startTime) : session.startTime;
      const newEndTime = endTime ? new Date(endTime) : session.endTime;

      const hasConflict = await Session.hasConflict(
        userId,
        newStartTime,
        newEndTime,
        session._id
      );

      if (hasConflict) {
        return res.status(400).json({
          success: false,
          message: "Scheduling conflict at the new time",
        });
      }

      // Reschedule the session
      await session.reschedule(newStartTime, newEndTime, userId, reason);

      // Send update notification
      try {
        await sendCalendarInvite(session, session.organizer, session.attendee, "update");
      } catch (emailError) {
        console.error("Failed to send update notification:", emailError);
      }
    }

    // Update other fields
    if (title) session.title = title;
    if (description) session.description = description;
    if (location) session.location = location;

    await session.save();

    res.status(200).json({
      success: true,
      message: "Session updated successfully",
      session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Confirm attendance
exports.confirmAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Only attendee can confirm
    if (session.attendee.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the attendee can confirm attendance",
      });
    }

    session.attendeeConfirmed = true;
    session.status = "confirmed";
    await session.save();

    res.status(200).json({
      success: true,
      message: "Attendance confirmed",
      session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Cancel session
exports.cancelSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const session = await Session.findById(id)
      .populate("organizer", "name email")
      .populate("attendee", "name email");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Verify user is part of this session
    if (
      session.organizer._id.toString() !== userId &&
      session.attendee._id.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this session",
      });
    }

    await session.cancel(reason, userId);

    // Send cancellation notification
    try {
      const recipient =
        session.organizer._id.toString() === userId
          ? session.attendee
          : session.organizer;

      await sendCalendarInvite(session, session.organizer, recipient, "cancel");
    } catch (emailError) {
      console.error("Failed to send cancellation notification:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Session cancelled",
      session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Mark session as completed
exports.completeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, feedback } = req.body;
    const userId = req.user.id;

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Verify user is part of this session
    if (
      session.organizer.toString() !== userId &&
      session.attendee.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to complete this session",
      });
    }

    // Check if session time has passed
    if (session.endTime > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark future session as completed",
      });
    }

    await session.markCompleted();

    // Award gamification points for completing session
    const { awardPoints, updateUserStats, checkBadges } = require("../services/gamificationService");

    // Calculate session duration in hours
    const duration = (session.endTime - session.startTime) / (1000 * 60 * 60);

    // Award points to both participants
    await awardPoints(session.organizer, "complete_session", 30, "Completed a teaching session");
    await awardPoints(session.attendee, "complete_session", 30, "Completed a learning session");

    // Update statistics
    await updateUserStats(session.organizer, "session_attended", 1);
    await updateUserStats(session.organizer, "hours_taught", duration);
    await updateUserStats(session.attendee, "session_attended", 1);
    await updateUserStats(session.attendee, "hours_learned", duration);

    // Check for new badges
    await checkBadges(session.organizer);
    await checkBadges(session.attendee);

    // Add notes and feedback if provided
    if (notes) {
      session.notes.afterSession = notes;
    }

    if (feedback) {
      if (session.organizer.toString() === userId) {
        session.feedback.organizerRating = feedback.rating;
        session.feedback.organizerComment = feedback.comment;
      } else {
        session.feedback.attendeeRating = feedback.rating;
        session.feedback.attendeeComment = feedback.comment;
      }
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: "Session marked as completed",
      session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get availability slots
exports.getAvailability = async (req, res) => {
  try {
    const { userId, date } = req.query;
    const targetUserId = userId || req.user.id;

    // Get all sessions for the user on the specified date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await Session.find({
      $or: [{ organizer: targetUserId }, { attendee: targetUserId }],
      startTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ["scheduled", "confirmed"] },
    }).select("startTime endTime");

    // Calculate available slots (simple implementation)
    const busySlots = sessions.map(session => ({
      start: session.startTime,
      end: session.endTime,
    }));

    res.status(200).json({
      success: true,
      busySlots,
      date,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update session
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Only organizer can update
    if (session.organizer.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the organizer can update the session",
      });
    }

    // Allowed fields to update
    const allowedUpdates = [
      "title",
      "description",
      "startTime",
      "endTime",
      "location",
      "reminders",
      "recurringPattern",
    ];

    // Update only allowed fields
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        session[field] = updates[field];
      }
    });

    await session.save();

    // Email notification removed - can be added later if needed

    res.status(200).json({
      success: true,
      session,
      message: "Session updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete session
exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Only organizer can delete
    if (session.organizer.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the organizer can delete the session",
      });
    }

    // Email notification removed - can be added later if needed

    await session.deleteOne();

    res.status(200).json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get session statistics
exports.getSessionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Session.aggregate([
      {
        $match: {
          $or: [
            { organizer: new mongoose.Types.ObjectId(userId) },
            { attendee: new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const upcomingCount = await Session.countDocuments({
      $or: [{ organizer: userId }, { attendee: userId }],
      startTime: { $gt: new Date() },
      status: { $in: ["scheduled", "confirmed"] },
    });

    const formattedStats = {
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      upcoming: upcomingCount,
    };

    stats.forEach((stat) => {
      formattedStats[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      stats: formattedStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};