const express = require("express");
const {
  createSwapRequest,
  getMySwapRequests,
  getSwapRequestById,
  acceptSwapRequest,
  rejectSwapRequest,
  cancelSwapRequest,
  getRequestStats,
  checkExistingRequest,
} = require("../controllers/swapRequestController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.post("/", createSwapRequest);
router.get("/", getMySwapRequests);
router.get("/stats", getRequestStats);
router.get("/check/:receiverId", checkExistingRequest);
router.get("/:id", getSwapRequestById);
router.put("/:id/accept", acceptSwapRequest);
router.put("/:id/reject", rejectSwapRequest);
router.put("/:id/cancel", cancelSwapRequest);

module.exports = router;