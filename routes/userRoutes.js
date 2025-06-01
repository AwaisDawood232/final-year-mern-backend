const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const matchingController = require("../controllers/matchingController");
const { protect } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// Profile Management Routes
router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);
router.get("/dashboard", userController.getDashboard);

// Skills Management Routes
router.post("/skills/teach", userController.addSkillToTeach);
router.post("/skills/learn", userController.addSkillToLearn);
router.put("/skills/teach/:skillId", userController.updateSkillToTeach);
router.delete("/skills/teach/:skillId", userController.removeSkillToTeach);
router.delete("/skills/learn/:skillId", userController.removeSkillToLearn);

// Availability Routes
router.put("/availability", userController.updateAvailability);

// Matching Routes
router.get("/matches", matchingController.getProfileMatches);
router.get("/matches/filters", matchingController.getFilterOptions);

// Profile Viewing Routes
router.get("/view/:userId", matchingController.viewUserProfile);

// Search and Discovery Routes
router.get("/search", userController.searchUsers);
router.get("/categories", userController.getSkillCategories);

// User Profile Routes
router.get("/:userId", userController.getUserById);
router.post("/:userId/rating", userController.addRating);

// Activity Routes
router.put("/activity", userController.updateActivity);

module.exports = router;