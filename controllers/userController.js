const { supabase } = require("../config/supabaseClient");

// Helper: fetch user row and optional vendor join
async function fetchUserWithVendor(userId) {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, email, phone_number, whatsapp_number, profile_picture, shop_link, profile_link, role, business_profile_id, business_profile:business_profile_id (id, business_name, cover_image, address, description, cover_image, business_phone, business_whatsapp_number, business_email, total_products, rating)"
    )
    .eq("id", userId)
    .maybeSingle();

  return { data, error };
}

exports.getMe = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { data, error } = await fetchUserWithVendor(userId);
    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Server error.", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const allowedFields = [
      "first_name",
      "last_name",
      "profile_picture",
      "phone_number",
      "whatsapp_number",
      "shop_link",
      "profile_link",
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (Object.keys(updates).length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update." });

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .maybeSingle();
    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Server error.", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.deactivateMe = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { data, error } = await supabase
      .from("users")
      .update({ status: "deleted" })
      .eq("id", userId)
      .select()
      .maybeSingle();
    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Server error.", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    return res.json({ success: true, message: "Account deactivated." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.getUserProfile = async (req, res) => {
  const userId = req.params.userId;
  try {
    const { data, error } = await fetchUserWithVendor(userId);
    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Server error.", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    const isAuthed = req.user && req.user.id === data.id;

    const publicUser = {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      profile_picture: data.profile_picture || null,
      shop_link: data.shop_link || null,
      profile_link: data.profile_link || null,
      role: data.role,
    };

    if (isAuthed) {
      publicUser.email = data.email || null;
      publicUser.phone_number = data.phone_number || null;
      publicUser.whatsapp_number = data.whatsapp_number || null;
    }

    if (data.business_profile) {
      const vp = data.business_profile;
      publicUser.business = {
        id: vp.id,
        business_name: vp.business_name,
        profileImage: vp.profile_image || null,
        description: vp.description || null,
        cover_image: vp.cover_image || null,
        total_products: vp.total_products || 0,
        rating: vp.rating || null,
      };

      if (isAuthed) {
        publicUser.business.business_phone = vp.business_phone || null;
        publicUser.business.business_whatsapp_number =
          vp.business_whatsapp_number || null;
        publicUser.business.email = vp.business_email || null;
        publicUser.business.address = vp.address || null;
      }
    }

    return res.json({ success: true, publicUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
