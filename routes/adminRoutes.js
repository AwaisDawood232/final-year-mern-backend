const express = require("express");
const {
  adminLogin,
  createAdmin,
  getAllAdmins,
  updateAdmin,
  deleteAdmin,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getDashboardStats,
} = require("../controllers/adminController");
const { adminAuth, superAdminAuth } = require("../middleware/adminAuth");

const router = express.Router();

router.post("/login", adminLogin);

router.use(adminAuth);

router.get("/dashboard/stats", getDashboardStats);

router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

router.get("/admins", getAllAdmins);
router.post("/admins", superAdminAuth, createAdmin);
router.put("/admins/:id", superAdminAuth, updateAdmin);
router.delete("/admins/:id", superAdminAuth, deleteAdmin);

module.exports = router;