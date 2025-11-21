const { supabase } = require("../config/supabaseClient");
const { z } = require("zod");
const generateSlug = require("../lib/slugGenerator");

// Schemas
const productSchema = z.object({
  name: z.string().min(2).max(20),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.string(),
  images: z.array(z.string()).min(1).max(5),
  category_id: z.string().optional(),
  category_ids: z.array(z.string()).optional(),
  location_state: z.string(),
  location_lga: z.string(),
  metadata: z.any().optional(),
  item_condition: z
    .enum(["new", "refurbished", "used"])
    .describe("Please indicate if the condition of the item")
    .optional(),
  amount_in_stock: z
    .string()
    .min(1, "Amount in stock must be at least 1")
    .optional(),
});
// metadata: z
//   .record(
//     z.union([
//       z.string(),
//       z.number(),
//       z.boolean(),
//       z.null(),
//       z.array(z.any()),
//       z.record(z.any()),
//     ])
//   )
//   .optional(),

// Helper: map query params to filters
function buildFilters(query) {
  const filters = [];
  // if (query.category)
  //   filters.push({ col: "category_id", op: "eq", val: query.category });
  if (query.tag) filters.push({ col: "tags", op: "cs", val: `{${query.tag}}` });
  if (query.minPrice)
    filters.push({ col: "price", op: "gte", val: Number(query.minPrice) });
  if (query.maxPrice)
    filters.push({ col: "price", op: "lte", val: Number(query.maxPrice) });
  if (query.location_state)
    filters.push({
      col: "location_state",
      op: "ilike",
      val: `%${query.location_state}%`,
    });
  if (query.location_lga)
    filters.push({
      col: "location_lga",
      op: "ilike",
      val: `%${query.location_lga}%`,
    });
  if (query.sale_type)
    filters.push({ col: "sale_type", op: "eq", val: query.sale_type });
  if (query.price_type)
    filters.push({ col: "price_type", op: "eq", val: query.price_type });
  if (query.amount_in_stock)
    filters.push({
      col: "amount_in_stock",
      op: "gte",
      val: Number(query.amount_in_stock),
    });
  if (query.item_condition)
    filters.push({
      col: "item_condition",
      op: "eq",
      val: query.item_condition,
    });
  return filters;
}

// Helper: Enrich products with location names
async function enrichProductsWithLocations(products) {
  if (!products || products.length === 0) return products;

  const stateIds = [...new Set(products.map((p) => p.location_state).filter(Boolean))];
  const lgaIds = [...new Set(products.map((p) => p.location_lga).filter(Boolean))];

  let stateMap = {};
  let lgaMap = {};

  if (stateIds.length > 0) {
    const { data: states } = await supabase
      .from("state_location")
      .select("state_id, name")
      .in("state_id", stateIds);
    if (states) {
      states.forEach((s) => (stateMap[s.state_id] = s.name));
    }
  }

  if (lgaIds.length > 0) {
    const { data: lgas } = await supabase
      .from("lga_location")
      .select("lga_id, name")
      .in("lga_id", lgaIds);
    if (lgas) {
      lgas.forEach((l) => (lgaMap[l.lga_id] = l.name));
    }
  }

  return products.map((p) => ({
    ...p,
    state_name: stateMap[p.location_state] || p.location_state,
    lga_name: lgaMap[p.location_lga] || p.location_lga,
    // Optional: return object as requested
    state: p.location_state ? { id: p.location_state, name: stateMap[p.location_state] } : null,
    lga: p.location_lga ? { id: p.location_lga, name: lgaMap[p.location_lga] } : null,
  }));
}

exports.addProduct = async (req, res) => {
  // Only vendors can add products
  const user = req.user;
  if (!user)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    const parsed = productSchema.parse(req.body);
    // console.log(parsed);

    // Normalize features: accept "a|b|c" or array
    let featuresArr = [];
    if (req.body.features !== undefined && req.body.features !== null) {
      if (Array.isArray(req.body.features)) {
        featuresArr = req.body.features
          .map((f) => (typeof f === "string" ? f.trim() : f))
          .filter(Boolean);
      } else if (typeof req.body.features === "string") {
        featuresArr = req.body.features
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Invalid features format" });
      }
    }

    // Validate enums
    const priceType = req.body.price_type;
    const saleType = req.body.sale_type;
    const priceInputMode = req.body.price_input_mode;
    const validPriceTypes = ["fixed", "negotiable"];
    const validSaleTypes = ["wholesale", "retail"];
    const validPriceInputMode = ["enter", "quote"];

    if (
      priceType !== undefined &&
      priceType !== null &&
      !validPriceTypes.includes(priceType)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid price_type" });
    }
    if (
      priceInputMode !== undefined &&
      priceInputMode !== null &&
      !validPriceInputMode.includes(priceInputMode)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid price_type" });
    }
    if (
      saleType !== undefined &&
      saleType !== null &&
      !validSaleTypes.includes(saleType)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid price_negotiable" });
    }

    // Check vendor profile - simplistic: we expect a vendor_profile record linked to user
    const { data: vp, error: vpErr } = await supabase
      .from("business_profile")
      .select("*")
      .eq("owner_id", user.id)
      .limit(1)
      .single();

    if (vpErr || !vp) {
      return res.status(400).json({
        success: false,
        message: "Business account is required to add products",
      });
    }

    const status = vp.status === "active" ? "active" : "pending_review";

    // Generate a unique slug
    let slug = generateSlug(parsed.name);
    let slugExists = true;
    while (slugExists) {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("slug")
        .eq("slug", slug);

      if (productError) {
        throw productError;
      }

      const { data: businessData, error: businessError } = await supabase
        .from("business_profile")
        .select("slug")
        .eq("slug", slug);

      if (businessError) {
        throw businessError;
      }

      if (productData.length === 0 && businessData.length === 0) {
        slugExists = false;
      } else {
        slug = generateSlug(parsed.name);
      }
    }

    // Build insert payload
    const payload = {
      product_owner_id: vp.id, // business_profile id
      name: parsed.name,
      slug: slug,
      description: parsed.description || null,
      price: parsed.price,
      images: parsed.images || [],
      // category_id: parsed.category_id || null, // Deprecated
      tags: parsed.tags || [],
      location_state: parsed.location_state,
      location_lga: parsed.location_lga,
      status,
      item_condition: parsed.item_condition || null,
      amount_in_stock: parsed.amount_in_stock || null,
      price_input_mode: priceInputMode,
      features: featuresArr.length > 0 ? featuresArr : null,
      price_type: priceType || null,
      sale_type: saleType || null,
      category_id:
        parsed.category_ids && parsed.category_ids.length > 0
          ? parsed.category_ids[0]
          : null,
    };

    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select()
      .single();

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Insert failed", error });

    // Insert categories
    if (parsed.category_ids && parsed.category_ids.length > 0) {
      const catInserts = parsed.category_ids.map((cid) => ({
        product_id: data.id,
        category_id: cid,
      }));
      const { error: catError } = await supabase
        .from("product_categories")
        .insert(catInserts);

      if (catError) {
        console.error("Failed to link categories:", catError);
        // Optional: rollback product creation?
      }
    }

    return res.status(201).json({ success: true, product: data });
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid payload", error: err.message });
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
      .select(
        "*, business:product_owner_id(id, business_name, cover_image), product_categories!inner(category_id)"
      )
      .eq("status", "active");

    if (req.query.category) {
      // Handle both single and multiple category IDs (comma-separated)
      const categoryIds = String(req.query.category).split(',').filter(Boolean);

      if (categoryIds.length === 1) {
        // Single category - use eq
        builder = builder.eq(
          "product_categories.category_id",
          categoryIds[0]
        );
      } else if (categoryIds.length > 1) {
        // Multiple categories - use in
        builder = builder.in(
          "product_categories.category_id",
          categoryIds
        );
      }
    }

    // Apply filters
    for (const f of filters) {
      if (f.op === "cs") builder = builder.contains(f.col, [req.query.tag]);
      else if (f.op === "ilike") builder = builder.ilike(f.col, f.val);
      else builder = builder[f.op](f.col, f.val);
    }

    // Search
    if (req.query.q) {
      const q = String(req.query.q).replace(/,/g, " ");
      // Use PostgREST .or with ilike on both name and description
      builder = builder.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
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

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Query failed", error });

    const enrichedProducts = await enrichProductsWithLocations(data || []);

    return res.json({
      page,
      perPage,
      products: enrichedProducts,
      total: count || null,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Get single product details
exports.getProduct = async (req, res) => {
  const id = req.params.id;

  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "*, business:product_owner_id(id, owner_id, business_name, description, cover_image, address, business_phone,slug, business_whatsapp_number), categories:product_categories(category(*))"
      )
      .eq("id", id)
      .maybeSingle();

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Fetch failed", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // Public-facing vendor preview: don't reveal contact fields
    const vendorPreview = {
      id: data.business?.id,
      business_name: data.business?.business_name,
      description: data.business.description,
      cover_image: data.business?.cover_image,
      slug: data.business?.slug,
      address: data.business?.address
        ? req.user
          ? data.business.address
          : null
        : null,
      business_phone: data.business?.business_phone
        ? req.user
          ? data.business.business_phone
          : null
        : null,
      business_whatsApp_number: data.business?.business_whatsapp_number
        ? req.user
          ? data.business.business_whatsapp_number
          : null
        : null,
    };

    // If user is authenticated and owner is allowed, contact details handled via dedicated endpoint
    const product = { ...data, business: vendorPreview };

    // Enrich with location
    const [enrichedProduct] = await enrichProductsWithLocations([product]);

    // Update views count asynchronously
    supabase
      .from("products")
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq("id", id)
      .then(() => { })
      .catch(() => { });

    return res.json({ success: true, product: enrichedProduct });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Get single product details by slug
exports.getProductBySlug = async (req, res) => {
  const { slug } = req.params;

  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "*, business:product_owner_id(id, owner_id, business_name, description,cover_image, address, business_phone,slug, business_whatsapp_number), categories:product_categories(category(*))"
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Fetch failed", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // Public-facing vendor preview: don't reveal contact fields
    const vendorPreview = {
      id: data.business?.id,
      business_name: data.business?.business_name,
      description: data.business.description,
      cover_image: data.business?.cover_image,
      slug: data.business?.slug,
      address: data.business?.address
        ? req.user
          ? data.business.address
          : null
        : null,
      business_phone: data.business?.business_phone
        ? req.user
          ? data.business.business_phone
          : null
        : null,
      business_whatsApp_number: data.business?.business_whatsapp_number
        ? req.user
          ? data.business.business_whatsapp_number
          : null
        : null,
    };

    // If user is authenticated and owner is allowed, contact details handled via dedicated endpoint
    const product = { ...data, business: vendorPreview };

    // Enrich with location
    const [enrichedProduct] = await enrichProductsWithLocations([product]);

    // Update views count asynchronously
    supabase
      .from("products")
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq("slug", slug)
      .then(() => { })
      .catch(() => { });

    return res.json({ success: true, product: enrichedProduct });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

exports.listProductsByVendor = async (req, res) => {
  const businessId = req.params.businessId;

  try {
    // Parse pagination parameters
    const page = Math.max(1, Number(req.query.page || 1));
    const perPage = Math.min(100, Number(req.query.perPage || 30));
    const offset = (page - 1) * perPage;

    // Build query
    let builder = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("product_owner_id", businessId)
      .eq("status", "active");

    // Search functionality
    if (req.query.q || req.query.search) {
      const searchTerm = String(req.query.q || req.query.search).replace(/,/g, " ");
      builder = builder.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    // Sorting
    const sort = req.query.sort || "latest";
    if (sort === "latest") {
      builder = builder.order("created_at", { ascending: false });
    } else if (sort === "price_asc") {
      builder = builder.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      builder = builder.order("price", { ascending: false });
    } else {
      // Default to latest
      builder = builder.order("created_at", { ascending: false });
    }

    // Apply pagination
    const { data, error, count } = await builder
      .range(offset, offset + perPage - 1);

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Query failed", error });

    const enrichedProducts = await enrichProductsWithLocations(data || []);

    // Calculate hasMore
    const total = count || 0;
    const hasMore = offset + perPage < total;

    return res.json({
      success: true,
      data: enrichedProducts,
      page,
      perPage,
      total,
      hasMore,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  const user = req.user;
  const id = req.params.id;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    // console.log("updateProduct called with body:", req.body);
    const parsed = productSchema.partial().parse(req.body);
    // console.log("Parsed data:", parsed);

    // Accept partial updates
    const allowed = [
      "name",
      "description",
      "price",
      "images",
      "categoryId",
      "category_ids",
      "features",
      "tags",
      "metadata",
      "item_condition",
      "amount_in_stock",
      "location_state",
      "location_lga",
      "price_input_mode",
      "price_type",
      "sale_type",
    ];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    // console.log("Updates to apply:", updates);

    // Sync category_id with the first category_id if provided
    if (
      req.body.category_ids !== undefined &&
      Array.isArray(req.body.category_ids) &&
      req.body.category_ids.length > 0
    ) {
      updates.category_id = req.body.category_ids[0];
    }

    // Normalize features: accept "a|b|c" or array
    if (updates.features !== undefined && updates.features !== null) {
      let featuresArr = [];
      if (Array.isArray(updates.features)) {
        featuresArr = updates.features
          .map((f) => (typeof f === "string" ? f.trim() : f))
          .filter(Boolean);
      } else if (typeof updates.features === "string") {
        featuresArr = updates.features
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      updates.features = featuresArr.length > 0 ? featuresArr : null;
    }

    if (Object.keys(updates).length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });

    // Ensure the product belongs to vendor owned by user
    const { data: prod, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (prodErr || !prod)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const { data: vp, error: vpErr } = await supabase
      .from("business_profile")
      .select("id, owner_id")
      .eq("id", prod.product_owner_id)
      .maybeSingle();

    if (vpErr || !vp || vp.owner_id !== user.id)
      return res.status(403).json({ success: false, message: "Forbidden" });

    // Don't update slug - it should remain permanent throughout product lifecycle
    // This prevents broken links and maintains SEO

    // Remove category_ids from updates - it's not a column in products table
    // It will be handled separately via product_categories junction table
    const { category_ids, ...productUpdates } = updates;

    // console.log("About to update product with:", productUpdates);
    const { data, error } = await supabase
      .from("products")
      .update(productUpdates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase update error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Update failed", error });
    }

    // Update categories
    if (req.body.category_ids) {
      // Delete old
      await supabase.from("product_categories").delete().eq("product_id", id);
      // Insert new
      if (req.body.category_ids.length > 0) {
        const catInserts = req.body.category_ids.map((cid) => ({
          product_id: id,
          category_id: cid,
        }));
        await supabase.from("product_categories").insert(catInserts);
      }
    }

    // console.log("Product updated successfully:", data);
    return res.json({ success: true, product: data });
  } catch (err) {
    console.error("updateProduct error:", err);
    return res
      .status(400)
      .json({ success: false, message: "Invalid payload", error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  const user = req.user;
  const id = req.params.id;
  if (!user)
    return res.status(401).json({ success: false, message: "Unauthorized" });

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

// Get top ranking products (by views_count)
exports.getTopRanking = async (req, res) => {
  try {
    const limit = Math.min(20, Number(req.query.limit || 10));

    const { data, error } = await supabase
      .from("products")
      .select(
        "*, business:product_owner_id(id, business_name, cover_image, slug), product_categories!inner(category_id)"
      )
      .eq("status", "active")
      .order("views_count", { ascending: false })
      .limit(limit);

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Query failed", error });

    const enrichedProducts = await enrichProductsWithLocations(data || []);

    return res.json({
      success: true,
      data: enrichedProducts,
      total: enrichedProducts.length,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Get new arrivals (by created_at)
exports.getNewArrivals = async (req, res) => {
  try {
    const limit = Math.min(20, Number(req.query.limit || 10));

    const { data, error } = await supabase
      .from("products")
      .select(
        "*, business:product_owner_id(id, business_name, cover_image, slug), product_categories!inner(category_id)"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Query failed", error });

    const enrichedProducts = await enrichProductsWithLocations(data || []);

    return res.json({
      success: true,
      data: enrichedProducts,
      total: enrichedProducts.length,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Get top deals (sorted by price ascending or other criteria)
exports.getTopDeals = async (req, res) => {
  try {
    const limit = Math.min(20, Number(req.query.limit || 10));
    const sort = req.query.sort || "price_asc"; // default to lowest price

    let builder = supabase
      .from("products")
      .select(
        "*, business:product_owner_id(id, business_name, cover_image, slug), product_categories!inner(category_id)"
      )
      .eq("status", "active");

    // Apply sorting
    if (sort === "price_asc") {
      builder = builder.order("price", { ascending: true });
    } else if (sort === "price_desc") {
      builder = builder.order("price", { ascending: false });
    } else if (sort === "newest") {
      builder = builder.order("created_at", { ascending: false });
    } else {
      // Default to price ascending
      builder = builder.order("price", { ascending: true });
    }

    const { data, error } = await builder.limit(limit);

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Query failed", error });

    const enrichedProducts = await enrichProductsWithLocations(data || []);

    return res.json({
      success: true,
      data: enrichedProducts,
      total: enrichedProducts.length,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
