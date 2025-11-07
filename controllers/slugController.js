const supabase = require("../config/supabaseClient");

const checkSlug = async (req, res) => {
  const { slug } = req.params;

  try {
    // Check for slug in products table
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("slug")
      .eq("slug", slug);

    if (productError) {
      throw productError;
    }

    // Check for slug in business_profile table
    const { data: businessData, error: businessError } = await supabase
      .from("business_profile")
      .select("slug")
      .eq("slug", slug);

    if (businessError) {
      throw businessError;
    }

    if (productData.length > 0 || businessData.length > 0) {
      return res.status(409).json({ error: "Slug already exists. Please choose another one." });
    }

    return res.status(200).json({ message: "Slug is available." });
  } catch (error) {
    console.error("Error checking slug:", error.message);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = {
  checkSlug,
};
