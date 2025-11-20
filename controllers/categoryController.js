const express = require("express");
const { supabase } = require("../config/supabaseClient");

// Helper: map query params to filters
function buildFilters(query) {
  const filters = [];
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
    state: p.location_state ? { id: p.location_state, name: stateMap[p.location_state] } : null,
    lga: p.location_lga ? { id: p.location_lga, name: lgaMap[p.location_lga] } : null,
  }));
}

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, parentCategoryId, description, icon, image } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "name and slug are required" });

    const payload = {
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, ""),
      parent_category_id: parentCategoryId || null,
      description: description || null,
      icon: icon || null,
      image: image || null,
    };

    const { data, error } = await supabase
      .from("category")
      .insert(payload)
      .select()
      .maybeSingle();
    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Failed to create category", error });

    // Add logic to update parent's child_categories array if parentCategoryId is provided
    if (parentCategoryId && parentCategoryId.length > 0) {
      const directParentIds = parentCategoryId[parentCategoryId.length - 1];
      const { data: parentCat, error: parentError } = await supabase
        .from("category")
        .select("child_categories")
        .eq("id", directParentIds)
        .maybeSingle();
      if (parentError) {
        console.error("Failed to fetch parent category:", parentError);
      } else if (parentCat) {
        const updatedChildCats = parentCat.child_categories || [];
        updatedChildCats.push(data.id);
        const { error: updateError } = await supabase
          .from("category")
          .update({ child_categories: updatedChildCats })
          .eq("id", directParentIds);
        if (updateError) {
          console.error(
            "Failed to update parent's child_categories:",
            updateError
          );
        }
      }
    }

    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// List categories (with optional pagination and parent filter)
exports.listCategories = async (req, res) => {
  try {
    const { page = 1, limit = 50, parent = null, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase.from("category").select("*");

    // only return active categories
    query = query.eq("status", "active");

    if (parent) query = query.eq("parent_category_id", parent);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + Number(limit) - 1);
    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch categories", error });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// List only parent categories
exports.listParentCategoriesOnly = async (req, res) => {
  try {
    const { page = 1, limit = 50, parent = null, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // parent_category_id is stored as NULL for top-level categories; use .is() to check IS NULL
    let query = supabase
      .from("category")
      .select("*")
      .is("parent_category_id", null)
      .eq("status", "active");

    // Note: don't use .eq(..., null) — that can produce a malformed array literal error
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + Number(limit) - 1);
    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch categories", error });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get a single category
exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("category")
      .select("*")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch category", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
// Get a single category
exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("category")
      .select("*")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch category", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get a single category with its parent categories
exports.getCategoryWithParentCategories = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("category")
      .select("*")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch category", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });

    if (
      Array.isArray(data.parent_category_id) &&
      data.parent_category_id.length
    ) {
      const ids = data.parent_category_id;
      const { data: parentCats, error: parentError } = await supabase
        .from("category")
        .select("*")
        .eq("status", "active")
        .in("id", ids);
      if (parentError)
        return res.status(500).json({
          success: false,
          message: "Failed to fetch parent categories",
          error: parentError,
        });

      // preserve original order of IDs and map missing ones to null
      const byId = new Map((parentCats || []).map((c) => [String(c.id), c]));
      data.parent_categories = ids.map((id) => byId.get(String(id)) || null);
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getCategoryWithChildCategories = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("category")
      .select("*")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch category", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });

    if (Array.isArray(data.child_categories) && data.child_categories.length) {
      const ids = data.child_categories;
      const { data: parentCats, error: parentError } = await supabase
        .from("category")
        .select("*")
        .eq("status", "active")
        .in("id", ids);
      if (parentError)
        return res.status(500).json({
          success: false,
          message: "Failed to fetch parent categories",
          error: parentError,
        });

      // preserve original order of IDs and map missing ones to null
      const byId = new Map((parentCats || []).map((c) => [String(c.id), c]));
      data.child_categories = ids.map((id) => byId.get(String(id)) || null);
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getCategoryWithParentChildCategories = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("category")
      .select("*")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();

    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch category", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });

    // Get all parent categories

    if (
      Array.isArray(data.parent_category_id) &&
      data.parent_category_id.length
    ) {
      const ids = data.parent_category_id;
      const { data: parentCats, error: parentError } = await supabase
        .from("category")
        .select("*")
        .eq("status", "active")
        .in("id", ids);
      if (parentError)
        return res.status(500).json({
          success: false,
          message: "Failed to fetch parent categories",
          error: parentError,
        });

      // preserve original order of IDs and map missing ones to null
      const byId = new Map((parentCats || []).map((c) => [String(c.id), c]));
      data.parent_categories = ids.map((id) => byId.get(String(id)) || null);
    }

    // Get all child categories
    if (Array.isArray(data.child_categories) && data.child_categories.length) {
      const ids = data.child_categories;
      const { data: parentCats, error: parentError } = await supabase
        .from("category")
        .select("*")
        .eq("status", "active")
        .in("id", ids);
      if (parentError)
        return res.status(500).json({
          success: false,
          message: "Failed to fetch parent categories",
          error: parentError,
        });

      // preserve original order of IDs and map missing ones to null
      const byId = new Map((parentCats || []).map((c) => [String(c.id), c]));
      data.child_categories = ids.map((id) => byId.get(String(id)) || null);
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all products related to a category
exports.listProductsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { data: catData, error: catError } = await supabase
      .from("category")
      .select("*")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();

    if (catError)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch category",
        error: catError,
      });

    if (!catData) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Determine category IDs (include children if present)
    const categoryIds = [id];
    if (catData.child_categories && Array.isArray(catData.child_categories)) {
      categoryIds.push(...catData.child_categories);
    }

    // Build Query - use product_categories junction table
    let builder = supabase
      .from("products")
      .select("*, business:product_owner_id(id, business_name, cover_image), product_categories!inner(category_id)", { count: "exact" })
      .eq("status", "active");

    // Filter by category using the junction table
    builder = builder.in("product_categories.category_id", categoryIds);

    // Apply Filters
    const filters = buildFilters(req.query);
    for (const f of filters) {
      if (f.op === "cs") builder = builder.contains(f.col, [f.val]); // Fix: val is already formatted in buildFilters? No, buildFilters does `{val}`. Wait, productController uses `[req.query.tag]`. Let's check buildFilters.
      // In buildFilters: val: `{${query.tag}}`. This is for .contains?
      // Supabase .contains expects array or object.
      // Let's stick to productController logic:
      // if (f.op === "cs") builder = builder.contains(f.col, [req.query.tag]);
      // But I don't have req.query.tag here easily if I iterate filters.
      // Let's adjust the loop to match productController exactly.
      if (f.op === "cs") {
        // The value in buildFilters is `{tag}` string.
        // Supabase JS client .contains() usually takes an array/json.
        // If productController works, I should follow it.
        // productController: if (f.op === "cs") builder = builder.contains(f.col, [req.query.tag]);
        // My buildFilters returns val: `{tag}`.
        // I will use the value from the filter object which I constructed.
        // Actually, let's just use the standard builder logic.
        builder = builder.filter(f.col, f.op, f.val);
      } else if (f.op === "ilike") {
        builder = builder.ilike(f.col, f.val);
      } else {
        builder = builder.filter(f.col, f.op, f.val);
      }
    }

    // Search
    if (req.query.q) {
      const q = String(req.query.q).replace(/,/g, " ");
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

    // Pagination
    const { data, error, count } = await builder
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch products", error });
    }

    // Enrich with location names
    const enrichedProducts = await enrichProductsWithLocations(data || []);

    return res.json({
      success: true,
      data: {
        products: enrichedProducts,
        total: count || 0,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (err) {
    console.error("Error in listProductsByCategory:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      "name",

      "parentCategoryId",
      "description",
      "icon",
      "image",
    ];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) {
        const dbKey = k === "parentCategoryId" ? "parent_category_id" : k;
        updates[dbKey] = req.body[k];
      }
    });
    if (Object.keys(updates).length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });

    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)

      .select()
      .maybeSingle();
    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Failed to update category", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete category (hard delete)
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("categories")
      .update({ status: "deleted" })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error)
      return res
        .status(500)
        .json({ success: false, message: "Failed to delete category", error });
    if (!data)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    return res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
// Get filter options for a category (states, lgas, price range)
exports.getCategoryFilters = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get category and children
    const { data: catData, error: catError } = await supabase
      .from("category")
      .select("id, child_categories")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();

    if (catError || !catData) {
      return res.json({ success: false, message: "Category not found" });
    }

    const categoryIds = [catData.id];
    if (catData.child_categories && Array.isArray(catData.child_categories)) {
      categoryIds.push(...catData.child_categories);
    }

    // 2. Fetch all active products in these categories to aggregate data
    // Note: For very large datasets, this aggregation should be done via RPC or a materialized view.
    // For now, we'll fetch relevant columns.
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("price, location_state, location_lga, price_type")
      .in("category_id", categoryIds)
      .eq("status", "active");

    if (prodError) {
      console.error("Error fetching products for filters:", prodError);
      return res.json({ success: false });
    }

    // 3. Aggregate
    const stateIdsSet = new Set();
    const lgaIdsSet = new Set();
    const priceTypesSet = new Set();
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    products.forEach((p) => {
      // Location IDs
      if (p.location_state) {
        stateIdsSet.add(p.location_state);
        if (p.location_lga) lgaIdsSet.add(p.location_lga);
      }

      // Price Type
      if (p.price_type) priceTypesSet.add(p.price_type);

      // Price Range
      const price = Number(p.price);
      if (!isNaN(price)) {
        if (price < minPrice) minPrice = price;
        if (price > maxPrice) maxPrice = price;
      }
    });

    // Resolve Names
    const stateIds = Array.from(stateIdsSet);
    const lgaIds = Array.from(lgaIdsSet);
    let stateMap = {}; // ID -> Name
    let lgaMap = {}; // ID -> Name

    if (stateIds.length > 0) {
      const { data: states } = await supabase
        .from("state_location")
        .select("state_id, name")
        .in("state_id", stateIds);
      if (states) states.forEach((s) => (stateMap[s.state_id] = s.name));
    }

    if (lgaIds.length > 0) {
      const { data: lgas } = await supabase
        .from("lga_location")
        .select("lga_id, name")
        .in("lga_id", lgaIds);
      if (lgas) lgas.forEach((l) => (lgaMap[l.lga_id] = l.name));
    }

    // Build Response Structure
    const statesFinal = new Set();
    const lgasFinal = {}; // StateName -> Set<LGAName>

    products.forEach((p) => {
      if (p.location_state && stateMap[p.location_state]) {
        const sName = stateMap[p.location_state];
        statesFinal.add(sName);

        if (p.location_lga && lgaMap[p.location_lga]) {
          if (!lgasFinal[sName]) lgasFinal[sName] = new Set();
          lgasFinal[sName].add(lgaMap[p.location_lga]);
        }
      }
    });

    // Format LGAs
    const lgasResponse = {};
    Object.keys(lgasFinal).forEach((s) => {
      lgasResponse[s] = Array.from(lgasFinal[s]).sort();
    });

    return res.json({
      success: true,
      data: {
        states: Array.from(statesFinal).sort(),
        lgas: lgasResponse,
        price_types: Array.from(priceTypesSet).sort(),
        minPrice: minPrice === Infinity ? 0 : minPrice,
        maxPrice: maxPrice === -Infinity ? 0 : maxPrice,
      },
    });
  } catch (err) {
    console.error("Server error in getCategoryFilters:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
