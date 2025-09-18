const Rating = require("../models/ratingModel");
const Session = require("../models/sessionModel");
const User = require("../models/userModel");
const SwapRequest = require("../models/swapRequestModel");
const { UserGamification } = require("../models/gamificationModel");
const { awardPoints, checkBadges } = require("../services/gamificationService");

// Create a rating for a completed session
exports.createRating = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const raterId = req.user.id;
    const {
      feedback,
      skills,
      wouldRecommend,
    } = req.body;

    // Get the session
    const session = await Session.findById(sessionId)
      .populate("organizer")
      .populate("attendee")
      .populate("swapRequest");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Check if session is completed
    if (session.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Can only rate completed sessions",
      });
    }

    // Determine who is being rated (handle both populated and non-populated fields)
    let rateeId;
    const organizerId = session.organizer._id ? session.organizer._id.toString() : session.organizer.toString();
    const attendeeId = session.attendee._id ? session.attendee._id.toString() : session.attendee.toString();

    if (organizerId === raterId) {
      rateeId = attendeeId;
    } else if (attendeeId === raterId) {
      rateeId = organizerId;
    } else {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this session",
      });
    }

    // Check if already rated
    const existingRating = await Rating.findOne({
      session: sessionId,
      rater: raterId,
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this session",
      });
    }

    // Create rating
    const newRating = await Rating.create({
      swapRequest: session.swapRequest,
      session: sessionId,
      rater: raterId,
      ratee: rateeId,
      feedback,
      skills,
      wouldRecommend,
    });

    // Update ratee's average rating
    const rateeRatings = await Rating.find({ ratee: rateeId });
    const avgRating = rateeRatings.reduce((acc, r) => acc + r.rating, 0) / rateeRatings.length;

    await User.findByIdAndUpdate(rateeId, {
      averageRating: avgRating,
      totalRatings: rateeRatings.length,
    });

    // Award gamification points
    await awardPoints(raterId, "give_rating", 10, "Provided feedback for a session");
    await awardPoints(rateeId, "receive_rating", 5, "Received a rating");

    if (newRating.rating >= 4) {
      await awardPoints(rateeId, "high_rating", 15, "Received a high rating (4+ stars)");
    }

    // Check for badge achievements
    await checkBadges(raterId);
    await checkBadges(rateeId);

    res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      rating: newRating,
    });
  } catch (error) {
    console.error("Error creating rating:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get ratings for a user
exports.getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = "received" } = req.query;

    let query = {};
    if (type === "received") {
      query.ratee = userId;
    } else if (type === "given") {
      query.rater = userId;
    }

    const ratings = await Rating.find(query)
      .populate("rater", "name avatar")
      .populate("ratee", "name avatar")
      .populate("session", "title startTime")
      .sort("-createdAt");

    // Calculate statistics
    const stats = {
      averageRating: 0,
      totalRatings: ratings.length,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      skills: {
        knowledge: 0,
        teaching: 0,
        communication: 0,
        punctuality: 0,
      },
    };

    if (ratings.length > 0) {
      ratings.forEach((rating) => {
        stats.distribution[Math.floor(rating.rating)]++;
        stats.skills.knowledge += rating.skills.knowledge;
        stats.skills.teaching += rating.skills.teaching;
        stats.skills.communication += rating.skills.communication;
        stats.skills.punctuality += rating.skills.punctuality;
      });

      stats.averageRating = ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length;
      Object.keys(stats.skills).forEach((skill) => {
        stats.skills[skill] = stats.skills[skill] / ratings.length;
      });
    }

    res.status(200).json({
      success: true,
      ratings,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get rating for a specific session
exports.getSessionRating = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const rating = await Rating.findOne({
      session: sessionId,
      rater: userId,
    }).populate("ratee", "name avatar");

    const canRate = await checkCanRateSession(sessionId, userId);

    res.status(200).json({
      success: true,
      rating,
      canRate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Check if user can rate a session
const checkCanRateSession = async (sessionId, userId) => {
  const session = await Session.findById(sessionId);

  if (!session || session.status !== "completed") {
    return false;
  }

  const isParticipant =
    session.organizer.toString() === userId ||
    session.attendee.toString() === userId;

  if (!isParticipant) {
    return false;
  }

  const existingRating = await Rating.findOne({
    session: sessionId,
    rater: userId,
  });

  return !existingRating;
};

// Update a rating (within 24 hours)
exports.updateRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const rating = await Rating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: "Rating not found",
      });
    }

    if (rating.rater.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own ratings",
      });
    }

    // Check if within 24 hours
    const hoursSinceCreation = (Date.now() - rating.createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(400).json({
        success: false,
        message: "Ratings can only be edited within 24 hours",
      });
    }

    // Update rating
    Object.assign(rating, updates);
    await rating.save();

    // Recalculate ratee's average
    const rateeRatings = await Rating.find({ ratee: rating.ratee });
    const avgRating = rateeRatings.reduce((acc, r) => acc + r.rating, 0) / rateeRatings.length;

    await User.findByIdAndUpdate(rating.ratee, {
      averageRating: avgRating,
    });

    res.status(200).json({
      success: true,
      message: "Rating updated successfully",
      rating,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Create a rating for a swap partner (without session)
exports.rateSwapPartner = async (req, res) => {
  try {
    const { swapRequestId } = req.params;
    const raterId = req.user.id;
    const {
      feedback,
      skills,
      wouldRecommend,
    } = req.body;

    // Get the swap request
    const swapRequest = await SwapRequest.findById(swapRequestId)
      .populate("sender")
      .populate("receiver");

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: "Swap request not found",
      });
    }

    // Check if swap is accepted
    if (swapRequest.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Can only rate accepted swap partners",
      });
    }

    // Determine who is being rated
    let rateeId;
    const senderId = swapRequest.sender._id ? swapRequest.sender._id.toString() : swapRequest.sender.toString();
    const receiverId = swapRequest.receiver._id ? swapRequest.receiver._id.toString() : swapRequest.receiver.toString();

    if (senderId === raterId) {
      rateeId = receiverId;
    } else if (receiverId === raterId) {
      rateeId = senderId;
    } else {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this swap request",
      });
    }

    // Check if already rated for this swap request
    const existingRating = await Rating.findOne({
      swapRequest: swapRequestId,
      rater: raterId,
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this swap partner",
      });
    }

    // Create rating without requiring a session
    const newRating = await Rating.create({
      swapRequest: swapRequestId,
      session: null, // No session required for direct swap rating
      rater: raterId,
      ratee: rateeId,
      feedback,
      skills,
      wouldRecommend,
    });

    // Update ratee's average rating
    const rateeRatings = await Rating.find({ ratee: rateeId });
    const avgRating = rateeRatings.reduce((acc, r) => acc + r.rating, 0) / rateeRatings.length;

    await User.findByIdAndUpdate(rateeId, {
      averageRating: avgRating,
      totalRatings: rateeRatings.length,
    });

    // Award gamification points
    await awardPoints(raterId, "give_rating", 10, "Provided feedback for a swap partner");
    await awardPoints(rateeId, "receive_rating", 5, "Received a rating");

    if (newRating.rating >= 4) {
      await awardPoints(rateeId, "high_rating", 15, "Received a high rating (4+ stars)");
    }

    // Check for badge achievements
    await checkBadges(raterId);
    await checkBadges(rateeId);

    res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      rating: newRating,
    });
  } catch (error) {
    console.error("Error creating swap rating:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};