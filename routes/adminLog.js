const express = require("express");
const router = express.Router();
const adminLogController = require("../controllers/adminLogController");
// const {
//   adminAuthMiddleware,
//   requirePermission,
// } = require("../middlewares/adminAuth");
const {
  requireRole,
  authMiddleware,
} = require("../middlewares/authMiddleware");

// router.use(adminAuthMiddlware); use this line when multiple admin middlewares are needed

// All routes require admin authentication
router.use(authMiddleware, requireRole("admin"));

// List logs with filtering
router.get("/", adminLogController.listLogs);

// Get single log entry
router.get("/:id", adminLogController.getLog);

// Get activity summary
router.get(
  "/summary",

  adminLogController.getActivitySummary
);

module.exports = router;
