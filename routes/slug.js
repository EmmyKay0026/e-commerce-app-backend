const express = require("express");
const router = express.Router();
const slugController = require("../controllers/slugController");

router.get("/:slug", slugController.checkSlug);

module.exports = router;
