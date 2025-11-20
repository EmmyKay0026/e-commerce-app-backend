const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const {
  authMiddleware,
  requireRole,
} = require("../middlewares/authMiddleware");

// Public: list and get
router.get("/", categoryController.listCategories);
// router.get("/sub-cats", categoryController.listCategories);
router.get(
  "/:id/with-child-cats",
  categoryController.getCategoryWithChildCategories
);
router.get("/parent-cats", categoryController.listParentCategoriesOnly);
router.get("/:id", categoryController.getCategory);
// router.get("slug/:slug", categoryController.getCategoryBySlug);
router.get(
  "/:id/with-parent-cats",
  categoryController.getCategoryWithParentCategories
);
router.get(
  "/:id/with-parent-child-cats",
  categoryController.getCategoryWithParentChildCategories
);

// Get filter options for a category
router.get("/:id/filters", categoryController.getCategoryFilters);

// Get all product realated to a category
router.get("/:id/products", categoryController.listProductsByCategory);

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
