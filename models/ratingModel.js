const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({
  swapRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SwapRequest",
    required: true,
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    required: false, // Making it optional to allow direct swap ratings
  },
  rater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  ratee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rating: {
    type: Number,
    required: false, // Will be calculated from skills in pre-save hook
    min: 1,
    max: 5,
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  skills: {
    knowledge: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    teaching: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    punctuality: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
  },
  wouldRecommend: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate ratings - compound index for both session and swap ratings
ratingSchema.index({ session: 1, rater: 1 }, { unique: true, sparse: true });
ratingSchema.index({ swapRequest: 1, rater: 1 }, { unique: true });

// Calculate average rating before saving
ratingSchema.pre("save", function(next) {
  const avgSkills = (
    this.skills.knowledge +
    this.skills.teaching +
    this.skills.communication +
    this.skills.punctuality
  ) / 4;

  this.rating = avgSkills;
  next();
});

module.exports = mongoose.model("Rating", ratingSchema);