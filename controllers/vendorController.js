const { z } = require("zod");
const { supabase } = require("../config/supabaseClient");

const vendorSchema = z.object({
  businessName: z.string().min(1),
  businessEmail: z.string().email().optional(),
  businessPhone: z.string().optional(),
  whatsAppNumber: z.string().min(4),
  coverImage: z.string().optional(),
  profileImage: z.string().optional(),
  address: z.string().min(1),
  description: z.string().optional(),
});

exports.createVendor = async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = vendorSchema.parse(req.body);

    // Insert vendor profile
    const { data: vendor, error: venErr } = await supabase
      .from("vendor_profiles")
      .insert([
        {
          owner_id: user.id,
          business_name: payload.businessName,
          business_email: payload.businessEmail || null,
          business_phone: payload.businessPhone || null,
          whats_app_number: payload.whatsAppNumber,
          cover_image: payload.coverImage || null,
          profile_image: payload.profileImage || null,
          address: payload.address,
          description: payload.description || null,
          status: "active",
        },
      ])
      .select()
      .single();

    if (venErr)
      return res
        .status(500)
        .json({ message: "Create vendor failed", error: venErr });

    // Update user: set business_profile_id and role
    await supabase
      .from("users")
      .update({ business_profile_id: vendor.id, role: "vendor" })
      .eq("id", user.id);

    return res.status(201).json({ vendor });
  } catch (err) {
    return res
      .status(400)
      .json({ message: "Invalid payload", error: err.message });
  }
};

exports.updateVendor = async (req, res) => {
  const user = req.user;
  const id = req.params.id;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    // Ensure the vendor exists and belongs to user
    const { data: existing } = await supabase
      .from("vendor_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!existing)
      return res.status(404).json({ message: "Vendor profile not found" });
    if (existing.owner_id !== user.id)
      return res.status(403).json({ message: "Forbidden" });

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
    ];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ message: "No valid fields to update" });

    const { data: vendor, error } = await supabase
      .from("vendor_profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) return res.status(500).json({ message: "Update failed", error });
    return res.json({ vendor });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
