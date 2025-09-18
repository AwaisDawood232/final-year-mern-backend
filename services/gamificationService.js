const { Badge, UserGamification } = require("../models/gamificationModel");

// Point values for different actions
const POINT_VALUES = {
  // Profile actions
  complete_profile: 50,
  upload_avatar: 10,
  add_skill: 5,
  verify_email: 20,

  // Social actions
  send_swap_request: 10,
  accept_swap_request: 15,
  complete_swap: 50,
  complete_session: 30,

  // Learning actions
  attend_session: 20,
  complete_hour_learning: 10,
  complete_hour_teaching: 15,

  // Community actions
  give_rating: 10,
  receive_rating: 5,
  high_rating: 15,
  help_others: 20,

  // Streak bonuses
  daily_login: 5,
  weekly_streak: 25,
  monthly_streak: 100,

  // Badge awards (set dynamically)
  badge_earned: 0,
};

// Badge definitions
const BADGES = [
  // Profile badges
  {
    id: "profile_complete",
    name: "Profile Pro",
    description: "Complete your profile with all details",
    icon: "👤",
    category: "profile",
    requirements: { type: "special", action: "complete_profile" },
    points: 25,
  },
  {
    id: "skill_collector_5",
    name: "Skill Collector",
    description: "Add 5 skills to your profile",
    icon: "🎯",
    category: "profile",
    requirements: { type: "count", value: 5, action: "skills_added" },
    points: 20,
  },

  // Social badges
  {
    id: "first_swap",
    name: "First Swap",
    description: "Complete your first skill swap",
    icon: "🤝",
    category: "social",
    requirements: { type: "count", value: 1, action: "swaps_completed" },
    points: 30,
  },
  {
    id: "swap_master_10",
    name: "Swap Master",
    description: "Complete 10 skill swaps",
    icon: "🏆",
    category: "social",
    requirements: { type: "count", value: 10, action: "swaps_completed" },
    points: 100,
  },
  {
    id: "networker",
    name: "Networker",
    description: "Connect with 5 different users",
    icon: "🌐",
    category: "social",
    requirements: { type: "count", value: 5, action: "unique_connections" },
    points: 50,
  },

  // Learning badges
  {
    id: "eager_learner",
    name: "Eager Learner",
    description: "Complete 10 hours of learning",
    icon: "📚",
    category: "learning",
    requirements: { type: "count", value: 10, action: "hours_learned" },
    points: 75,
  },
  {
    id: "knowledge_seeker",
    name: "Knowledge Seeker",
    description: "Learn 3 different skills",
    icon: "🔍",
    category: "learning",
    requirements: { type: "count", value: 3, action: "skills_learned" },
    points: 60,
  },

  // Teaching badges
  {
    id: "mentor",
    name: "Mentor",
    description: "Teach for 10 hours",
    icon: "👨‍🏫",
    category: "teaching",
    requirements: { type: "count", value: 10, action: "hours_taught" },
    points: 75,
  },
  {
    id: "top_teacher",
    name: "Top Teacher",
    description: "Maintain 4.5+ rating with 10+ reviews",
    icon: "⭐",
    category: "teaching",
    requirements: { type: "rating", value: 4.5, action: "maintain_rating" },
    points: 150,
  },

  // Community badges
  {
    id: "reviewer",
    name: "Reviewer",
    description: "Give 10 ratings",
    icon: "✍️",
    category: "community",
    requirements: { type: "count", value: 10, action: "ratings_given" },
    points: 40,
  },
  {
    id: "trusted_member",
    name: "Trusted Member",
    description: "Receive 10 positive ratings (4+)",
    icon: "💎",
    category: "community",
    requirements: { type: "count", value: 10, action: "positive_ratings" },
    points: 80,
  },

  // Milestone badges
  {
    id: "week_streak",
    name: "Week Warrior",
    description: "7-day login streak",
    icon: "🔥",
    category: "milestone",
    requirements: { type: "streak", value: 7, action: "login_streak" },
    points: 50,
  },
  {
    id: "month_streak",
    name: "Dedication",
    description: "30-day login streak",
    icon: "💪",
    category: "milestone",
    requirements: { type: "streak", value: 30, action: "login_streak" },
    points: 200,
  },
  {
    id: "centurion",
    name: "Centurion",
    description: "Reach 1000 points",
    icon: "💯",
    category: "milestone",
    requirements: { type: "points", value: 1000 },
    points: 100,
  },
];

// Initialize badges in database
const initializeBadges = async () => {
  try {
    for (const badge of BADGES) {
      await Badge.findOneAndUpdate(
        { id: badge.id },
        badge,
        { upsert: true, new: true }
      );
    }
    console.log("Badges initialized successfully");
  } catch (error) {
    console.error("Error initializing badges:", error);
  }
};

// Get or create user gamification profile
const getOrCreateUserGamification = async (userId) => {
  let userGamification = await UserGamification.findOne({ user: userId });

  if (!userGamification) {
    userGamification = await UserGamification.create({
      user: userId,
      points: { total: 0, available: 0, spent: 0 },
    });
  }

  return userGamification;
};

// Award points to a user
const awardPoints = async (userId, action, points, description, metadata = {}) => {
  try {
    const userGamification = await getOrCreateUserGamification(userId);

    // Use predefined points if not specified
    const pointValue = points || POINT_VALUES[action] || 0;

    if (pointValue > 0) {
      userGamification.addPoints(action, pointValue, description, metadata);
      await userGamification.save();
    }

    return userGamification;
  } catch (error) {
    console.error("Error awarding points:", error);
    throw error;
  }
};

// Check and award badges
const checkBadges = async (userId) => {
  try {
    const userGamification = await getOrCreateUserGamification(userId);
    const badges = await Badge.find();
    const newBadges = [];

    for (const badge of badges) {
      const hasEarned = userGamification.badges.some(b => b.badge === badge.id);

      if (!hasEarned) {
        let earned = false;

        switch (badge.requirements.type) {
          case "points":
            if (userGamification.points.total >= badge.requirements.value) {
              earned = true;
            }
            break;

          case "count":
            // Check specific statistics
            if (badge.requirements.action === "swaps_completed") {
              if (userGamification.statistics.swapsCompleted >= badge.requirements.value) {
                earned = true;
              }
            } else if (badge.requirements.action === "ratings_given") {
              if (userGamification.statistics.ratingsGiven >= badge.requirements.value) {
                earned = true;
              }
            } else if (badge.requirements.action === "hours_learned") {
              if (userGamification.statistics.hoursLearned >= badge.requirements.value) {
                earned = true;
              }
            } else if (badge.requirements.action === "hours_taught") {
              if (userGamification.statistics.hoursTaught >= badge.requirements.value) {
                earned = true;
              }
            }
            break;

          case "streak":
            if (badge.requirements.action === "login_streak") {
              if (userGamification.streaks.login.current >= badge.requirements.value) {
                earned = true;
              }
            }
            break;

          case "rating":
            if (userGamification.statistics.averageRating >= badge.requirements.value &&
                userGamification.statistics.totalRatings >= 10) {
              earned = true;
            }
            break;
        }

        if (earned) {
          userGamification.awardBadge(badge.id, badge);
          newBadges.push(badge);
        }
      }
    }

    if (newBadges.length > 0) {
      await userGamification.save();
    }

    return newBadges;
  } catch (error) {
    console.error("Error checking badges:", error);
    return [];
  }
};

// Update login streak
const updateLoginStreak = async (userId) => {
  try {
    const userGamification = await getOrCreateUserGamification(userId);
    const today = new Date().setHours(0, 0, 0, 0);
    const lastLogin = userGamification.streaks.login.lastLoginDate
      ? new Date(userGamification.streaks.login.lastLoginDate).setHours(0, 0, 0, 0)
      : null;

    if (!lastLogin || lastLogin < today) {
      const daysDiff = lastLogin ? (today - lastLogin) / (1000 * 60 * 60 * 24) : 0;

      if (daysDiff === 1) {
        // Consecutive day
        userGamification.streaks.login.current += 1;
      } else if (daysDiff > 1) {
        // Streak broken
        userGamification.streaks.login.current = 1;
      } else {
        // First login
        userGamification.streaks.login.current = 1;
      }

      // Update longest streak
      if (userGamification.streaks.login.current > userGamification.streaks.login.longest) {
        userGamification.streaks.login.longest = userGamification.streaks.login.current;
      }

      userGamification.streaks.login.lastLoginDate = new Date();

      // Award daily login points
      await awardPoints(userId, "daily_login", null, "Daily login bonus");

      // Check streak bonuses
      if (userGamification.streaks.login.current === 7) {
        await awardPoints(userId, "weekly_streak", null, "7-day login streak!");
      } else if (userGamification.streaks.login.current === 30) {
        await awardPoints(userId, "monthly_streak", null, "30-day login streak!");
      }

      await userGamification.save();
    }

    return userGamification;
  } catch (error) {
    console.error("Error updating login streak:", error);
  }
};

// Update user statistics
const updateUserStats = async (userId, statType, value = 1) => {
  try {
    const userGamification = await getOrCreateUserGamification(userId);

    switch (statType) {
      case "swap_completed":
        userGamification.statistics.swapsCompleted += value;
        break;
      case "session_attended":
        userGamification.statistics.sessionsAttended += value;
        break;
      case "hours_learned":
        userGamification.statistics.hoursLearned += value;
        break;
      case "hours_taught":
        userGamification.statistics.hoursTaught += value;
        break;
      case "rating_given":
        userGamification.statistics.ratingsGiven += value;
        break;
    }

    await userGamification.save();
    return userGamification;
  } catch (error) {
    console.error("Error updating user stats:", error);
  }
};

module.exports = {
  initializeBadges,
  getOrCreateUserGamification,
  awardPoints,
  checkBadges,
  updateLoginStreak,
  updateUserStats,
  POINT_VALUES,
  BADGES,
};