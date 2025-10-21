const express = require("express");
const router = express.Router();
// const tokenVerifier = require("../middlewares/tokenVerifier");
const userController = require("../controllers/userController");
const {
  authMiddleware,
  optionalAuthMiddleware,
} = require("../middlewares/authMiddleware");
// const { authMiddleware } = require("../middlewares/tokenVerifier");

// All routes require authentication
router.get("/me", authMiddleware, userController.getMe);
router.patch("/me", authMiddleware, userController.updateMe);
router.delete("/me", authMiddleware, userController.deactivateMe);

// Public profile endpoint; controller will include contact details only when requester is authenticated
router.get("/:userId", optionalAuthMiddleware, userController.getUserProfile);

module.exports = router;
