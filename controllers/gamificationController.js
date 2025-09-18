const { Badge, UserGamification } = require("../models/gamificationModel");
const User = require("../models/userModel");
const {
  getOrCreateUserGamification,
  checkBadges,
  updateLoginStreak,
  BADGES,
} = require("../services/gamificationService");

// Get user's gamification profile
exports.getUserGamification = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;

    const userGamification = await getOrCreateUserGamification(userId);
    const user = await User.findById(userId).select("name avatar email");

    // Update login streak if it's the user's own profile
    if (userId === req.user.id) {
      await updateLoginStreak(userId);
    }

    // Check for new badges
    const newBadges = await checkBadges(userId);

    // Get badge details
    const badgeIds = userGamification.badges.map(b => b.badge);
    const badgeDetails = await Badge.find({ id: { $in: badgeIds } });

    const gamificationData = {
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        email: user.email,
      },
      points: userGamification.points,
      level: userGamification.level,
      rank: userGamification.rank,
      badges: userGamification.badges.map(badge => {
        const details = badgeDetails.find(b => b.id === badge.badge);
        return {
          ...badge.toObject(),
          details: details || null,
        };
      }),
      streaks: userGamification.streaks,
      statistics: userGamification.statistics,
      recentActivity: userGamification.pointHistory.slice(-10).reverse(),
      newBadges,
    };

    res.status(200).json({
      success: true,
      gamification: gamificationData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const {
      timeframe = "all",
      limit = 10,
      page = 1,
    } = req.query;

    const skip = (page - 1) * limit;

    // Build date filter for timeframe
    let dateFilter = {};
    const now = new Date();

    switch (timeframe) {
      case "daily":
        dateFilter = {
          "pointHistory.createdAt": {
            $gte: new Date(now.setHours(0, 0, 0, 0)),
          },
        };
        break;
      case "weekly":
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        dateFilter = {
          "pointHistory.createdAt": { $gte: weekAgo },
        };
        break;
      case "monthly":
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        dateFilter = {
          "pointHistory.createdAt": { $gte: monthAgo },
        };
        break;
    }

    // Get top users by points
    const leaderboard = await UserGamification.find(dateFilter)
      .sort("-points.total")
      .limit(parseInt(limit))
      .skip(skip)
      .populate("user", "name avatar email");

    // Get current user's rank
    const currentUserId = req.user.id;
    const currentUserGamification = await UserGamification.findOne({
      user: currentUserId,
    });

    let currentUserRank = null;
    if (currentUserGamification) {
      const higherRanked = await UserGamification.countDocuments({
        "points.total": { $gt: currentUserGamification.points.total },
      });
      currentUserRank = higherRanked + 1;
    }

    // Format leaderboard data
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: skip + index + 1,
      user: {
        id: entry.user._id,
        name: entry.user.name,
        avatar: entry.user.avatar,
      },
      points: entry.points.total,
      level: entry.level.current,
      rank: entry.rank,
      badges: entry.badges.length,
      swapsCompleted: entry.statistics.swapsCompleted,
    }));

    res.status(200).json({
      success: true,
      leaderboard: formattedLeaderboard,
      currentUserRank,
      totalUsers: await UserGamification.countDocuments(),
      page: parseInt(page),
      hasMore: skip + leaderboard.length < await UserGamification.countDocuments(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all available badges
exports.getAllBadges = async (req, res) => {
  try {
    const badges = await Badge.find().sort("category name");
    const userId = req.user.id;

    const userGamification = await getOrCreateUserGamification(userId);
    const earnedBadgeIds = userGamification.badges.map(b => b.badge);

    const categorizedBadges = {};
    badges.forEach(badge => {
      if (!categorizedBadges[badge.category]) {
        categorizedBadges[badge.category] = [];
      }

      categorizedBadges[badge.category].push({
        ...badge.toObject(),
        earned: earnedBadgeIds.includes(badge.id),
        earnedAt: earnedBadgeIds.includes(badge.id)
          ? userGamification.badges.find(b => b.badge === badge.id).earnedAt
          : null,
      });
    });

    res.status(200).json({
      success: true,
      badges: categorizedBadges,
      totalBadges: badges.length,
      earnedBadges: earnedBadgeIds.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get point history
exports.getPointHistory = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const userGamification = await getOrCreateUserGamification(userId);

    const history = userGamification.pointHistory
      .slice(-parseInt(limit) - parseInt(offset), -parseInt(offset) || undefined)
      .reverse();

    res.status(200).json({
      success: true,
      history,
      total: userGamification.pointHistory.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get gamification stats for dashboard
exports.getGamificationStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const userGamification = await getOrCreateUserGamification(userId);

    // Calculate progress to next level
    const progressPercentage = (userGamification.level.progress / userGamification.level.nextLevelPoints) * 100;

    // Get recent badges (last 3)
    const recentBadgeIds = userGamification.badges
      .slice(-3)
      .map(b => b.badge);
    const recentBadges = await Badge.find({ id: { $in: recentBadgeIds } });

    // Get user's rank position
    const higherRanked = await UserGamification.countDocuments({
      "points.total": { $gt: userGamification.points.total },
    });
    const rankPosition = higherRanked + 1;

    const stats = {
      points: {
        total: userGamification.points.total,
        available: userGamification.points.available,
        thisWeek: calculateWeeklyPoints(userGamification.pointHistory),
      },
      level: {
        current: userGamification.level.current,
        progress: userGamification.level.progress,
        nextLevelPoints: userGamification.level.nextLevelPoints,
        progressPercentage,
      },
      rank: {
        title: userGamification.rank,
        position: rankPosition,
        totalUsers: await UserGamification.countDocuments(),
      },
      badges: {
        total: userGamification.badges.length,
        recent: recentBadges,
      },
      streaks: {
        login: userGamification.streaks.login.current,
        swap: userGamification.streaks.swap.current,
      },
      achievements: {
        swapsCompleted: userGamification.statistics.swapsCompleted,
        hoursLearned: userGamification.statistics.hoursLearned,
        hoursTaught: userGamification.statistics.hoursTaught,
        averageRating: userGamification.statistics.averageRating,
      },
    };

    res.status(200).json({
      success: true,
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

// Helper function to calculate weekly points
const calculateWeeklyPoints = (pointHistory) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  return pointHistory
    .filter(entry => new Date(entry.createdAt) >= weekAgo)
    .reduce((total, entry) => total + entry.points, 0);
};