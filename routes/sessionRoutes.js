const express = require("express");
const {
  createSession,
  getMySessions,
  getSessionById,
  updateSession,
  deleteSession,
  confirmAttendance,
  cancelSession,
  completeSession,
  getAvailability,
  getSessionStats,
} = require("../controllers/sessionController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Session CRUD operations
router.post("/", createSession);
router.get("/", getMySessions);
router.get("/stats", getSessionStats);
router.get("/availability", getAvailability);
router.get("/:id", getSessionById);
router.put("/:id", updateSession);
router.delete("/:id", deleteSession);
router.put("/:id/confirm", confirmAttendance);
router.put("/:id/cancel", cancelSession);
router.put("/:id/complete", completeSession);

module.exports = router;