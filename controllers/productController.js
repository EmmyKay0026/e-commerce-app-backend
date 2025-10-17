const { supabase } = require("../config/supabaseClient");
const { z } = require("zod");

// Schemas
const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  images: z.array(z.string()).optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  condition: z.string().optional(),
});

// Helper: map query params to filters
function buildFilters(query) {
  const filters = [];
  if (query.category)
    filters.push({ col: "category_id", op: "eq", val: query.category });
  if (query.tag) filters.push({ col: "tags", op: "cs", val: `{${query.tag}}` });
  if (query.minPrice)
    filters.push({ col: "price", op: "gte", val: Number(query.minPrice) });
  if (query.maxPrice)
    filters.push({ col: "price", op: "lte", val: Number(query.maxPrice) });
  if (query.vendorLocation)
    filters.push({
      col: "vendor_location",
      op: "ilike",
      val: `%${query.vendorLocation}%`,
    });
  return filters;
}

exports.addProduct = async (req, res) => {
  // Only vendors can add products
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const parsed = productSchema.parse(req.body);

    // Check vendor profile - simplistic: we expect a vendor_profile record linked to user
    const { data: vp, error: vpErr } = await supabase
      .from("business_profile")
      .select("*")
      .eq("owner_id", user.id)
      .limit(1)
      .single();

    if (vpErr || !vp) {
      return res
        .status(400)
        .json({ message: "Vendor profile required to add products" });
    }

    const status = vp.status === "active" ? "active" : "pending";

    // Any authenticated user can add products, but must have vendor profile
    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          product_owner_id: vp.id, //business_profile id
          name: parsed.name,
          description: parsed.description || null,
          price: parsed.price,
          images: parsed.images || [],
          category_id: parsed.categoryId || null,
          tags: parsed.tags || [],
          condition: parsed.condition || null,
          status,
        },
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ message: "Insert failed", error });
    return res.status(201).json({ product: data });
  } catch (err) {
    return res
      .status(400)
      .json({ message: "Invalid payload", error: err.message });
  }
};

exports.listProducts = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const perPage = Math.min(100, Number(req.query.perPage || 12));
    const offset = (page - 1) * perPage;

    const filters = buildFilters(req.query);

    let builder = supabase
      .from("products")
      .select("*, vendor:product_owner_id(id, business_name, cover_image)")
      .eq("status", "active");

    // Apply filters
    for (const f of filters) {
      if (f.op === "cs") builder = builder.contains(f.col, [req.query.tag]);
      else if (f.op === "ilike") builder = builder.ilike(f.col, f.val);
      else builder = builder[f.op](f.col, f.val);
    }

    // Search
    if (req.query.q) {
      builder = builder
        .ilike("name", `%${req.query.q}%`)
        .or(`description.ilike.%${req.query.q}%`);
    }

    // Sorting
    if (req.query.sort === "newest")
      builder = builder.order("created_at", { ascending: false });
    else if (req.query.sort === "price_asc")
      builder = builder.order("price", { ascending: true });
    else if (req.query.sort === "price_desc")
      builder = builder.order("price", { ascending: false });
    else if (req.query.sort === "popular")
      builder = builder.order("views_count", { ascending: false });
    else builder = builder.order("created_at", { ascending: false });

    const { data, error, count } = await builder
      .range(offset, offset + perPage - 1)
      .throwOnError();

    if (error) return res.status(500).json({ message: "Query failed", error });

    return res.json({
      page,
      perPage,
      products: data || [],
      total: count || null,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

exports.getProduct = async (req, res) => {
  const id = req.params.id;
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "*, vendor:product_owner_id(id, owner_id, business_name, cover_image, address, business_phone, business_whatsapp_number)"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ message: "Fetch failed", error });
    if (!data) return res.status(404).json({ message: "Product not found" });

    // Public-facing vendor preview: don't reveal contact fields
    const vendorPreview = {
      id: data.vendor?.id,
      businessName: data.vendor?.business_name,
      profileImage: data.vendor?.profile_image,
      address: data.vendor?.address
        ? req.user
          ? data.vendor.address
          : null
        : null,
    };

    // If user is authenticated and owner is allowed, contact details handled via dedicated endpoint
    const product = { ...data, vendor: vendorPreview };
    return res.json({ product });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  const user = req.user;
  const id = req.params.id;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const parsed = productSchema.partial().parse(req.body);

    // Ensure the product belongs to vendor owned by user
    const { data: prod, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (prodErr || !prod)
      return res.status(404).json({ message: "Product not found" });

    const { data: vp, error: vpErr } = await supabase
      .from("business_profile")
      .select("id, owner_id")
      .eq("id", prod.product_owner_id)
      .maybeSingle();

    if (vpErr || !vp || vp.owner_id !== user.id)
      return res.status(403).json({ message: "Forbidden" });

    const { data, error } = await supabase
      .from("products")
      .update(parsed)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) return res.status(500).json({ message: "Update failed", error });
    return res.json({ product: data });
  } catch (err) {
    return res
      .status(400)
      .json({ message: "Invalid payload", error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  const user = req.user;
  const id = req.params.id;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    // Verify ownership
    const { data: prod, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (prodErr || !prod)
      return res.status(404).json({ message: "Product not found" });

    const { data: vp } = await supabase
      .from("business_profile")
      .select("owner_id")
      .eq("id", prod.product_owner_id)
      .maybeSingle();
    if (!vp || vp.owner_id !== user.id)
      return res.status(403).json({ message: "Forbidden" });

    // Soft delete: set status = deleted
    const { data, error } = await supabase
      .from("products")
      .update({ status: "deleted" })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) return res.status(500).json({ message: "Delete failed", error });
    return res.json({ message: "Product soft-deleted", product: data });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// Record contact view and return vendor contact details
exports.recordContactView = async (req, res) => {
  const user = req.user;
  const id = req.params.id;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { data } = await supabase
      .from("products")
      .select(
        "*, vendor:vendor_profiles(id, owner_id, business_name, profile_image, address, phone, whatsapp, email)"
      )
      .eq("id", id)
      .maybeSingle();
    if (!data) return res.status(404).json({ message: "Product not found" });

    // Record analytics event
    await supabase.from("product_contact_views").insert([
      {
        product_id: id,
        user_id: user.id,
        vendor_id: data.vendor?.id || null,
        created_at: new Date().toISOString(),
      },
    ]);

    // Optionally increment a counter
    await supabase
      .from("products")
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq("id", id);

    // Return contact details
    const contact = {
      phone: data.vendor?.phone || null,
      whatsapp: data.vendor?.whatsapp || null,
      email: data.vendor?.email || null,
      address: data.vendor?.address || null,
    };

    return res.json({ contact });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
