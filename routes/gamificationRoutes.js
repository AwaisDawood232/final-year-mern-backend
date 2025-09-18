const express = require("express");
const router = express.Router();
const {
  getUserGamification,
  getLeaderboard,
  getAllBadges,
  getPointHistory,
  getGamificationStats,
} = require("../controllers/gamificationController");
const { protect } = require("../middleware/auth");

// Gamification routes
router.get("/profile/:userId", protect, getUserGamification);
router.get("/profile", protect, getUserGamification);
router.get("/leaderboard", protect, getLeaderboard);
router.get("/badges", protect, getAllBadges);
router.get("/points/history/:userId", protect, getPointHistory);
router.get("/points/history", protect, getPointHistory);
router.get("/stats", protect, getGamificationStats);

module.exports = router;