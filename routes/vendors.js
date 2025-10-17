const express = require("express");
const router = express.Router();
// const tokenVerifier = require("../lib/middlewares/tokenVerifier");
const vendorController = require("../controllers/vendorController");
const { authMiddleware } = require("../middlewares/authMiddleware");

// Create vendor profile (authenticated users)
router.post("/", authMiddleware, vendorController.createVendor);

// Update vendor profile (owner)
router.patch("/:id", authMiddleware, vendorController.updateVendor);

module.exports = router;
