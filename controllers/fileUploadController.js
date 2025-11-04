const { generateUploadURL } = require("../services/generateUploadUrl.js");

exports.getImageUploadUrl = async (req, res) => {
  try {
    const cfResponse = await generateUploadURL();
    const data = await cfResponse.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
