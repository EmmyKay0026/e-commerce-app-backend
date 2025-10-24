const e = require("express");
const { supabase } = require("../config/supabaseClient");

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

    // If category has no child categories, fetch products directly linked to it
    // Otherwise, fetch products linked to its child categories
    if (!catData.child_categories) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(offset, offset + Number(limit) - 1);
      if (error)
        return res
          .status(500)
          .json({ success: false, message: "Failed to fetch products", error });
      return res.json({ success: true, products: data });
    }
    // Fetch products linked to child categories

    const childCategoryIds = catData.child_categories;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .in("category_id", childCategoryIds)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch products", error });
    }

    return res.json({ success: true, data });
  } catch (err) {
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
