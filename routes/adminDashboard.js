const express = require("express");
const router = express.Router();
const adminDashboard = require("../controllers/adminDashboardController");
const {
  requireRole,
  authMiddleware,
} = require("../middlewares/authMiddleware");

// router.use(adminAuthMiddlware); use this line when multiple admin middlewares are needed

// Apply admin authentication to all routes
router.use(authMiddleware, requireRole("admin"));

// User Management Routes
router.get("/users", adminDashboard.listUsers);
router.get(
  "/users/pending-verification",
  adminDashboard.getPendingVerifcationBusinessProfiles
);
router.patch("/users/:userId/status", adminDashboard.updateUserStatus);

// Business profile Management Routes
router.get("/businessProfile", adminDashboard.listBusinessProfiles); //Get all users with active business profiles
router.patch(
  "/businessProfile/:businessProfileId/status",
  adminDashboard.updateBusinessProfileStatus
);

// Analytics Routes
router.get("/stats", adminDashboard.getDashboardStats);
router.get("/activity", adminDashboard.getRecentActivity);

module.exports = router;
