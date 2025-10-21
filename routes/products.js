const express = require("express");
const router = express.Router();
// const tokenVerifier = require("../lib/middlewares/tokenVerifier");
const productController = require("../controllers/productController");
const {
  authMiddleware,
  optionalAuthMiddleware,
} = require("../middlewares/authMiddleware");

// Public
router.get("/", productController.listProducts);
router.get("/:id", optionalAuthMiddleware, productController.getProduct);

// Protected actions (vendor)
router.post("/", authMiddleware, productController.addProduct);
router.patch("/:id", authMiddleware, productController.updateProduct);
router.delete("/:id", authMiddleware, productController.deleteProduct);

// Contact view (records analytics) - protected for showing contact details
router.post(
  "/:id/contact-view",
  authMiddleware,
  productController.recordContactView
);

module.exports = router;
