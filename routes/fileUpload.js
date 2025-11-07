const express = require("express");
const router = express.Router();
const fileUploadController = require("../controllers/fileUploadController");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.post("/get-upload-url", fileUploadController.getImageUploadUrl);
router.post(
  "/r2-upload-urls",
  authMiddleware,
  fileUploadController.getR2UploadUrl
);
// router.get("/r2", console.log(here));

router.post("/delete-image", authMiddleware, fileUploadController.deleteImage);

module.exports = router;
