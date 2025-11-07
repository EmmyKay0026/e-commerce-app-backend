const {
  generateUploadURL,
  generateMultipleUploadUrls,
  deleteR2Object,
} = require("../services/generateUploadUrl.js");

exports.getR2UploadUrl = async (req, res) => {
  // 🚨 Authentication: Check the user's session/token/etc. here before proceeding!
  if (!req.user || !req.body.files || !Array.isArray(req.body.files)) {
    return res.status(401).json({ error: "Unauthorized or invalid request." });
  }

  try {
    const fileDetails = req.body.files.map((f) => ({
      originalFileName: f.fileName,
      contentType: f.contentType,
    }));

    const urls = await generateMultipleUploadUrls(fileDetails);

    // Success: Send the array of URLs and keys back to the client
    res.status(200).json({ urls });
  } catch (error) {
    console.error("Multi-URL Generation Error:", error);
    res
      .status(500)
      .json({ error: "Failed to generate required upload links." });
  }
};

exports.getImageUploadUrl = async (req, res) => {
  try {
    const cfResponse = await generateUploadURL();
    const data = await cfResponse.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.deleteImage = async (req, res) => {
  if (!req.user || !req.body.fileKey) {
    return res.status(401).json({ error: "Unauthorized or invalid request." });
  }

  try {
    const { fileKey } = req.body;
    await deleteR2Object(fileKey);
    res.status(200).json({ message: `Object ${fileKey} deleted successfully.` });
  } catch (error) {
    console.error("R2 Object Deletion Error:", error);
    res.status(500).json({ error: "Failed to delete image from R2." });
  }
};
