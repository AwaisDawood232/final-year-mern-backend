const express = require("express");
const router = express.Router();
const {
  createRating,
  getUserRatings,
  getSessionRating,
  updateRating,
  rateSwapPartner,
} = require("../controllers/ratingController");
const { protect } = require("../middleware/auth");

// Rating routes
router.post("/sessions/:sessionId/rate", protect, createRating);
router.post("/swaps/:swapRequestId/rate", protect, rateSwapPartner);
router.get("/users/:userId/ratings", protect, getUserRatings);
router.get("/sessions/:sessionId/rating", protect, getSessionRating);
router.put("/ratings/:ratingId", protect, updateRating);

module.exports = router;