const SwapRequest = require("../models/swapRequestModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");

exports.createSwapRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const {
      receiverId,
      senderSkills,
      receiverSkills,
      message,
      proposedSchedule,
    } = req.body;

    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a swap request to yourself",
      });
    }

    const existingRequest = await SwapRequest.getRequestBetweenUsers(
      senderId,
      receiverId
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "A swap request already exists between these users",
      });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    const swapRequest = await SwapRequest.create({
      sender: senderId,
      receiver: receiverId,
      senderSkills,
      receiverSkills,
      message,
      proposedSchedule,
    });

    const populatedRequest = await SwapRequest.findById(swapRequest._id)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    res.status(201).json({
      success: true,
      message: "Swap request sent successfully",
      swapRequest: populatedRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getMySwapRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, status } = req.query;

    let query = {};

    if (type === "sent") {
      query.sender = userId;
    } else if (type === "received") {
      query.receiver = userId;
    } else {
      query.$or = [{ sender: userId }, { receiver: userId }];
    }

    if (status) {
      query.status = status;
    }

    const requests = await SwapRequest.find(query)
      .populate("sender", "name email avatar occupation location skillsToTeach")
      .populate("receiver", "name email avatar occupation location skillsToTeach")
      .sort({ createdAt: -1 });

    const categorizedRequests = {
      sent: [],
      received: [],
      accepted: [],
    };

    requests.forEach((request) => {
      if (request.status === "accepted") {
        categorizedRequests.accepted.push(request);
      } else if (request.sender._id.toString() === userId) {
        categorizedRequests.sent.push(request);
      } else {
        categorizedRequests.received.push(request);
      }
    });

    res.status(200).json({
      success: true,
      requests: categorizedRequests,
      total: requests.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getSwapRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const request = await SwapRequest.findById(id)
      .populate("sender", "name email avatar bio location occupation skillsToTeach skillsToLearn languages availability")
      .populate("receiver", "name email avatar bio location occupation skillsToTeach skillsToLearn languages availability");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Swap request not found",
      });
    }

    if (
      request.sender._id.toString() !== userId &&
      request.receiver._id.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this request",
      });
    }

    res.status(200).json({
      success: true,
      swapRequest: request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.acceptSwapRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const request = await SwapRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Swap request not found",
      });
    }

    if (request.receiver.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to accept this request",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot accept a request with status: ${request.status}`,
      });
    }

    if (request.isExpired()) {
      return res.status(400).json({
        success: false,
        message: "This request has expired",
      });
    }

    await request.accept();

    const updatedRequest = await SwapRequest.findById(id)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    res.status(200).json({
      success: true,
      message: "Swap request accepted successfully",
      swapRequest: updatedRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.rejectSwapRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const request = await SwapRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Swap request not found",
      });
    }

    if (request.receiver.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to reject this request",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a request with status: ${request.status}`,
      });
    }

    await request.reject(reason);

    const updatedRequest = await SwapRequest.findById(id)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    res.status(200).json({
      success: true,
      message: "Swap request rejected",
      swapRequest: updatedRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.cancelSwapRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const request = await SwapRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Swap request not found",
      });
    }

    if (request.sender.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this request",
      });
    }

    if (!["pending", "accepted"].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a request with status: ${request.status}`,
      });
    }

    await request.cancel();

    res.status(200).json({
      success: true,
      message: "Swap request cancelled",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getRequestStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await SwapRequest.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(userId) },
            { receiver: new mongoose.Types.ObjectId(userId) },
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

    const pendingReceived = await SwapRequest.countDocuments({
      receiver: userId,
      status: "pending",
    });

    const formattedStats = {
      sent: 0,
      received: 0,
      accepted: 0,
      rejected: 0,
      cancelled: 0,
      completed: 0,
      pendingReceived,
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

exports.checkExistingRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.params;

    const existingRequest = await SwapRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
      status: { $in: ["pending", "accepted"] },
    }).populate("sender receiver", "name");

    res.status(200).json({
      success: true,
      hasExistingRequest: !!existingRequest,
      request: existingRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};