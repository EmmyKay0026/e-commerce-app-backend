const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");
const {
  authMiddleware,
  requireRole,
  optionalAuthMiddleware,
} = require("../middlewares/authMiddleware");

// Get all business profiles (admin only)
router.get(
  "/",
  authMiddleware,
  requireRole("admin"),
  vendorController.getAllBusinessProfiles
);

// Get single business profile (public route with optional auth)
router.get(
  "/:id",
  optionalAuthMiddleware,
  vendorController.getBusinessProfileById
);
router.get(
  "/:slug",
  optionalAuthMiddleware,
  vendorController.getBusinessProfileBySlug
);

// Create vendor profile (authenticated users)
router.post("/", authMiddleware, vendorController.createBusinessProfile);

// Update vendor profile (owner)
router.patch("/:id", authMiddleware, vendorController.updateVendor);

router.delete(
  "/:id",
  authMiddleware,
  vendorController.deactivateBusinessAccount
);

module.exports = router;
