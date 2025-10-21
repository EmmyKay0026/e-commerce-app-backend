const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category");
const {
  authMiddleware,
  requireRole,
} = require("../middlewares/authMiddleware");

// Public: list and get
router.get("/", categoryController.listCategories);
router.get("/:id", categoryController.getCategory);

// Protected: create, update, delete
router.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  categoryController.createCategory
);
router.patch(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  categoryController.updateCategory
);
router.delete(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  categoryController.deleteCategory
);

module.exports = router;
