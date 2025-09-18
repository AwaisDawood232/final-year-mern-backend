const mongoose = require("mongoose");

const badgeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["profile", "social", "learning", "teaching", "community", "milestone"],
    required: true,
  },
  requirements: {
    type: {
      type: String,
      enum: ["points", "count", "streak", "rating", "special"],
      required: true,
    },
    value: Number,
    action: String,
  },
  points: {
    type: Number,
    default: 0,
  },
});

const achievementSchema = new mongoose.Schema({
  badge: {
    type: String,
    required: true,
  },
  earnedAt: {
    type: Date,
    default: Date.now,
  },
  progress: {
    current: {
      type: Number,
      default: 0,
    },
    target: {
      type: Number,
      default: 0,
    },
  },
});

const pointHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const userGamificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  points: {
    total: {
      type: Number,
      default: 0,
    },
    available: {
      type: Number,
      default: 0,
    },
    spent: {
      type: Number,
      default: 0,
    },
  },
  level: {
    current: {
      type: Number,
      default: 1,
    },
    progress: {
      type: Number,
      default: 0,
    },
    nextLevelPoints: {
      type: Number,
      default: 100,
    },
  },
  badges: [achievementSchema],
  streaks: {
    login: {
      current: {
        type: Number,
        default: 0,
      },
      longest: {
        type: Number,
        default: 0,
      },
      lastLoginDate: Date,
    },
    swap: {
      current: {
        type: Number,
        default: 0,
      },
      longest: {
        type: Number,
        default: 0,
      },
      lastSwapDate: Date,
    },
  },
  statistics: {
    swapsCompleted: {
      type: Number,
      default: 0,
    },
    sessionsAttended: {
      type: Number,
      default: 0,
    },
    hoursLearned: {
      type: Number,
      default: 0,
    },
    hoursTaught: {
      type: Number,
      default: 0,
    },
    ratingsGiven: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
  },
  pointHistory: [pointHistorySchema],
  rank: {
    type: String,
    enum: ["Beginner", "Learner", "Skilled", "Expert", "Master", "Guru"],
    default: "Beginner",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update level based on points
userGamificationSchema.methods.updateLevel = function() {
  const pointsPerLevel = 100;
  const level = Math.floor(this.points.total / pointsPerLevel) + 1;

  this.level.current = level;
  this.level.progress = this.points.total % pointsPerLevel;
  this.level.nextLevelPoints = pointsPerLevel;

  // Update rank based on level
  if (level >= 20) this.rank = "Guru";
  else if (level >= 15) this.rank = "Master";
  else if (level >= 10) this.rank = "Expert";
  else if (level >= 7) this.rank = "Skilled";
  else if (level >= 4) this.rank = "Learner";
  else this.rank = "Beginner";
};

// Add points and record history
userGamificationSchema.methods.addPoints = function(action, points, description, metadata = {}) {
  this.points.total += points;
  this.points.available += points;

  this.pointHistory.push({
    action,
    points,
    description,
    metadata,
  });

  // Keep only last 100 history items
  if (this.pointHistory.length > 100) {
    this.pointHistory = this.pointHistory.slice(-100);
  }

  this.updateLevel();
  this.updatedAt = new Date();
};

// Award badge
userGamificationSchema.methods.awardBadge = function(badgeId, badgeData) {
  const existingBadge = this.badges.find(b => b.badge === badgeId);

  if (!existingBadge) {
    this.badges.push({
      badge: badgeId,
      earnedAt: new Date(),
    });

    // Award points for earning badge
    if (badgeData.points) {
      this.addPoints("badge_earned", badgeData.points, `Earned badge: ${badgeData.name}`);
    }

    return true;
  }

  return false;
};

module.exports = {
  Badge: mongoose.model("Badge", badgeSchema),
  UserGamification: mongoose.model("UserGamification", userGamificationSchema),
};