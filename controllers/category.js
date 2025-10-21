const { supabase } = require("../config/supabaseClient");

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, slug, parentCategoryId, description, icon, image } = req.body;
    if (!name || !slug)
      return res.status(400).json({ message: "name and slug are required" });

    const payload = {
      name,
      slug,
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
        .json({ message: "Failed to create category", error });

    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// List categories (with optional pagination and parent filter)
exports.listCategories = async (req, res) => {
  try {
    const { page = 1, limit = 50, parent = null, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase.from("categories").select("*");

    if (parent) query = query.eq("parent_category_id", parent);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + Number(limit) - 1);
    if (error)
      return res
        .status(500)
        .json({ message: "Failed to fetch categories", error });

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Get a single category
exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error)
      return res
        .status(500)
        .json({ message: "Failed to fetch category", error });
    if (!data) return res.status(404).json({ message: "Category not found" });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      "name",
      "slug",
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
      return res.status(400).json({ message: "No valid fields to update" });

    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error)
      return res
        .status(500)
        .json({ message: "Failed to update category", error });
    if (!data) return res.status(404).json({ message: "Category not found" });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete category (hard delete)
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error)
      return res
        .status(500)
        .json({ message: "Failed to delete category", error });
    if (!data) return res.status(404).json({ message: "Category not found" });
    return res.json({ message: "Category deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
