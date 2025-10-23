const { z, success } = require("zod");
const { supabase } = require("../config/supabaseClient");

const vendorSchema = z.object({
  business_name: z.string(),
  business_email: z.email(),
  business_phone: z.string(),
  business_whatsapp_number: z.string().min(4),
  cover_image: z.string().optional(),
  address: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
});

// Renamed the function to be more general
exports.createBusinessProfile = async (req, res) => {
  // 1. Get userId from URL parameters (preferred for specific user actions)
  const userId = req.user.id;

  // 2. Validate user ID presence (basic check)
  if (!userId) {
    return res
      .status(400)
      .json({ message: "User ID is required in the request." });
  }

  try {
    const payload = vendorSchema.parse(req.body);

    // I. Insert new business profile row
    const { data: businessProfile, error: bpErr } = await supabase
      .from("business_profile") // Renamed for clarity, verify your table name
      .insert([
        {
          // 💡 CRUCIAL CHANGE: Use the received userId instead of req.user.id
          owner_id: userId,
          business_name: payload.business_name,
          business_email: payload.business_email || null,
          business_phone: payload.business_phone || null,
          business_whatsapp_number: payload.whatsAppNumber,
          cover_image: payload.cover_image || null,
          address: payload.address,
          description: payload.description || null,
          status: "active",
          slug: payload.business_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, ""),
        },
      ])
      .select()
      .single();

    if (bpErr) {
      return res.status(500).json({
        success: false,
        message: "Create business profile failed",
        error: bpErr,
      });
    }

    // II. Update user table: link the new business_profile_id and set role
    await supabase
      .from("users")
      .update({
        business_profile_id: businessProfile.id,
        role: "vendor", // Assuming this function is exclusively for vendors
      })
      .eq("id", userId); // Use the same received userId to update the correct user

    return res.status(201).json({ success: true, businessProfile });
  } catch (err) {
    // Catches validation errors from vendorSchema.parse(req.body)
    return res
      .status(400)
      .json({ message: "Invalid payload or server error", error: err.message });
  }
};

exports.updateVendor = async (req, res) => {
  const user = req.user;
  const id = req.params.id;
  if (!user)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    // Ensure the vendor exists and belongs to user
    const { data: existing } = await supabase
      .from("business_profile")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Vendor profile not found" });
    if (existing.owner_id !== user.id && user.role !== "admin")
      return res.status(403).json({ success: false, message: "Forbidden" });

    // Accept partial updates
    const allowed = [
      "business_name",
      "business_email",
      "business_phone",
      "whats_app_number",
      "cover_image",
      "profile_image",
      "address",
      "description",
      "status",
      "slug",
    ];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (Object.keys(updates).length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });

    const { data: vendor, error } = await supabase
      .from("business_profile")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Update failed", error });
    return res.json({ success: true, vendor });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

exports.getBusinessProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    const isAuthenticated = req.user && req.user.id == id; // Check if user is authenticated

    // Base query to get business profile
    const { data: profile, error } = await supabase
      .from("business_profile")
      .select(
        `
        *,
        user:owner_id (
          id,
          first_name,
          last_name,
          email,
          phone_number,
          whatsapp_number
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch business profile",
        error: error.message,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found",
      });
    }

    // If user is not authenticated, remove contact information
    if (!isAuthenticated) {
      // Create a new object without sensitive contact info
      const publicProfile = {
        ...profile,
        business_email: undefined,
        business_phone: undefined,
        business_whatsapp_number: undefined,
        user: {
          id: profile.user.id,
          first_name: profile.user.first_name,
          last_name: profile.user.last_name,
          email: undefined,
          phone_number: undefined,
          whatsapp_number: undefined,
        },
      };

      return res.status(200).json({
        success: true,
        data: publicProfile,
      });
    }

    // Return full profile for authenticated users
    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

exports.getBusinessProfileBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const isAuthenticated = req.user; // Check if user is authenticated

    // Base query to get business profile
    const { data: profile, error } = await supabase
      .from("business_profile")
      .select(
        `
        *,
        user:owner_id (
          id,
          first_name,
          last_name,
          email,
          phone_number,
          whatsapp_number
        )
      `
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch business profile",
        error: error.message,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Business profile not found",
      });
    }

    // If user is not authenticated, remove contact information
    if (!isAuthenticated) {
      // Create a new object without sensitive contact info
      const publicProfile = {
        ...profile,
        business_email: undefined,
        business_phone: undefined,
        business_whatsapp_number: undefined,
        user: {
          id: profile.user.id,
          first_name: profile.user.first_name,
          last_name: profile.user.last_name,
          email: undefined,
          phone_number: undefined,
          whatsapp_number: undefined,
        },
      };

      return res.status(200).json({
        success: true,
        data: publicProfile,
      });
    }

    // Return full profile for authenticated users
    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

exports.getAllBusinessProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase.from("business_profile").select(
      `
        *,
        users:owner_id (
          id,
          email,
          first_name,
          last_name,
          email,
          phone_number,
          whatsapp_number
          
        )
      `,
      { count: "exact" }
    );

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        "business_name.ilike.%" +
          search +
          "%,business_email.ilike.%" +
          search +
          "%"
      );
    }

    const {
      data: profiles,
      count,
      error,
    } = await query
      .range(offset, offset + Number(limit) - 1)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch business profiles",
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        profiles,
        total: count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

exports.deactivateBusinessAccount = async (req, res) => {
  const user = req.user;
  const id = req.params.id;
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  if (!id)
    return res.status(400).json({ message: "Business profile ID is required" });

  try {
    const { data: existing, error: getErr } = await supabase
      .from("business_profile")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (getErr)
      return res.status(500).json({ message: "Lookup failed", error: getErr });
    if (!existing)
      return res.status(404).json({ message: "Business profile not found" });

    // Allow owner or admin to deactivate
    if (existing.owner_id !== user.id && user.role !== "admin")
      return res.status(403).json({ message: "Forbidden" });

    const updates = {
      status: "suspended", // soft delete marker
    };

    const { data: updated, error: updErr } = await supabase
      .from("business_profile")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (updErr)
      return res
        .status(500)
        .json({ success: false, message: "Deactivate failed", error: updErr });

    // If the owner deactivated their own account, remove link and downgrade role
    if (existing.owner_id === user.id) {
      await supabase
        .from("users")
        .update({ business_profile_id: null, role: "user" })
        .eq("id", user.id);
    }

    return res.json({
      success: true,
      message: "Business account deactivated",
      businessProfile: updated,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
