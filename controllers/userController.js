const { supabase } = require("../config/supabaseClient");

// Helper: fetch user row and optional vendor join
async function fetchUserByBusinessSlug(slug) {
  const { data: businessProfile, error: bpError } = await supabase
    .from("business_profile")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (bpError) return { data: null, error: bpError };
  if (!businessProfile)
    return { data: null, error: { message: "Business profile not found" } };

  const businessProfileId = businessProfile.id;

  const { data, error } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, email, phone_number, whatsapp_number,saved_items, profile_picture, shop_link, profile_link, role, business_profile_id, business_profile:business_profile_id (id, business_name, cover_image, address, description, cover_image, business_phone, business_whatsapp_number, business_email, total_products, slug)"
    )
    .eq("business_profile_id", businessProfileId)
    .maybeSingle();

  return { data, error };
}

async function fetchUserWithVendor(userId) {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, email, phone_number, whatsapp_number,saved_items, profile_picture, shop_link, profile_link, role, business_profile_id, business_profile:business_profile_id (id, business_name, cover_image, address, description, cover_image, business_phone, business_whatsapp_number, business_email, total_products, slug)"
    )
    .eq("id", userId)
    .maybeSingle();

  return { data, error };
}

async function fetchUserWithVendorWithSlug(slug) {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, email, phone_number, whatsapp_number,saved_items, profile_picture, shop_link, profile_link, role, business_profile_id, business_profile:business_profile_id (id, business_name, cover_image, address, description, cover_image, business_phone, business_whatsapp_number, business_email, total_products, slug)"
    )
    .eq("profile_link", slug)
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

exports.updateSavedItems = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { productId } = req.body;

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!productId)
      return res
        .status(400)
        .json({ success: false, message: "productId is required" });

    // Fetch current user's saved_items
    const { data: currentUser, error: userError } = await supabase
      .from("users")
      .select("id, saved_items")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      return res
        .status(500)
        .json({ success: false, message: "Server error.", error: userError });
    }
    if (!currentUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const existing = Array.isArray(currentUser.saved_items)
      ? currentUser.saved_items
      : [];

    // Determine whether saved_items contains objects with `id` or plain ids
    const containsObjects =
      existing.length > 0 &&
      typeof existing[0] === "object" &&
      existing[0] !== null &&
      "id" in existing[0];

    let newSavedItems;
    if (containsObjects) {
      const exists = existing.some((p) => String(p.id) === String(productId));
      if (exists) {
        // remove
        newSavedItems = existing.filter(
          (p) => String(p.id) !== String(productId)
        );
      } else {
        // add with timestamp
        newSavedItems = [
          ...existing,
          { id: String(productId), saved_at: new Date().toISOString() },
        ];
      }
    } else {
      // array of primitive ids
      const exists = existing.map(String).includes(String(productId));
      if (exists) {
        newSavedItems = existing
          .map(String)
          .filter((p) => p !== String(productId));
      } else {
        newSavedItems = [...existing.map(String), String(productId)];
      }
    }

    const { data, error } = await supabase
      .from("users")
      .update({ saved_items: newSavedItems })
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Server error.", error });

    return res.json({ success: true, data });
  } catch (err) {
    console.error("updateSavedItems error:", err);
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

    const isAuthed = req.user;

    const publicUser = {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      profile_picture: data.profile_picture || null,
      shop_link: data.shop_link || null,
      profile_link: data.profile_link || null,
      role: data.role,
    };
    // console.log(data);

    if (isAuthed) {
      // console.log("is auth");
      publicUser.email = data.email || null;
      publicUser.phone_number = data.phone_number || null;
      publicUser.whatsapp_number = data.whatsapp_number || null;
    }

    if (data.role == "vendor" && data.business_profile) {
      const vp = data.business_profile;
      // console.log("Vendor profile", vp);

      publicUser.business_profile = {
        id: vp.id,
        business_name: vp.business_name,
        description: vp.description || null,
        cover_image: vp.cover_image || null,
        total_products: vp.total_products || 0,
        rating: vp.rating || null,
        slug: vp.slug,
      };

      if (isAuthed) {
        // console.log("business_profile ran");

        publicUser.business_profile.business_phone = vp.business_phone || null;
        publicUser.business_profile.business_whatsapp_number =
          vp.business_whatsapp_number || null;
        publicUser.business_profile.email = vp.business_email || null;
        publicUser.business_profile.address = vp.address || null;
      }
    }

    return res.json({ success: true, data: publicUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.getUserProfileBySlug = async (req, res) => {
  const slug = req.params.slug;
  try {
    const { data, error } = await fetchUserWithVendorWithSlug(slug);
    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Server error.", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    const isAuthed = req.user;

    const publicUser = {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      profile_picture: data.profile_picture || null,
      shop_link: data.shop_link || null,
      profile_link: data.profile_link || null,
      role: data.role,
    };
    // console.log(data);

    if (isAuthed) {
      // console.log("is auth");
      publicUser.email = data.email || null;
      publicUser.phone_number = data.phone_number || null;
      publicUser.whatsapp_number = data.whatsapp_number || null;
    }

    if (data.role == "vendor" && data.business_profile) {
      const vp = data.business_profile;
      // console.log("Vendor profile", vp);

      publicUser.business_profile = {
        id: vp.id,
        business_name: vp.business_name,
        description: vp.description || null,
        cover_image: vp.cover_image || null,
        total_products: vp.total_products || 0,
        rating: vp.rating || null,
        slug: vp.slug,
      };

      if (isAuthed) {
        // console.log("business_profile ran");

        publicUser.business_profile.business_phone = vp.business_phone || null;
        publicUser.business_profile.business_whatsapp_number =
          vp.business_whatsapp_number || null;
        publicUser.business_profile.email = vp.business_email || null;
        publicUser.business_profile.address = vp.address || null;
      }
    }

    return res.json({ success: true, data: publicUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.getUserProfileBySlugs = async (req, res) => {
  const { slug } = req.params;
  try {
    const { data, error } = await fetchUserByBusinessSlug(slug);
    if (error && error.message === "Business profile not found") {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Server error.", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    const isAuthed = req.user;

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

    if (data.role == "vendor" && data.business_profile) {
      const vp = data.business_profile;

      publicUser.business_profile = {
        id: vp.id,
        business_name: vp.business_name,
        description: vp.description || null,
        cover_image: vp.cover_image || null,
        total_products: vp.total_products || 0,
        rating: vp.rating || null,
        slug: vp.slug,
      };

      if (isAuthed) {
        publicUser.business_profile.business_phone = vp.business_phone || null;
        publicUser.business_profile.business_whatsapp_number =
          vp.business_whatsapp_number || null;
        publicUser.business_profile.email = vp.business_email || null;
        publicUser.business_profile.address = vp.address || null;
      }
    }

    return res.json({ success: true, data: publicUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
