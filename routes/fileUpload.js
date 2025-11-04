const express = require("express");
const router = express.Router();
const fileUploadController = require("../controllers/fileUploadController");

router.post("/get-upload-url", fileUploadController.getImageUploadUrl);

module.exports = router;
