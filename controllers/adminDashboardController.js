const { success } = require("zod");
const { supabase } = require("../config/supabaseClient");
const { logAdminActivity } = require("./adminLogController");

// User Management
exports.listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase.from("users").select("*", { count: "exact" });

    if (role) query = query.eq("role", role);
    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(
        "email.ilike.%" +
          search +
          "%,first_name.ilike.%" +
          search +
          "%,last_name.ilike.%" +
          search +
          "%"
      );
    }

    const {
      data: users,
      count,
      error,
    } = await query
      .range(offset, offset + Number(limit) - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Uncomment the following lines if you want to log this activity
    // await logAdminActivity(req.admin.id, "LIST_USERS", {
    //   filters: { role, status, search },
    // });

    res.json({
      success: true,
      users,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
    });
  } catch (error) {
    console.error("Error in listUsers:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    if (!["active", "suspended", "deleted"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .update({
        status: status,
        status_update_reason: reason,
      })
      .eq("id", userId)
      .select()
      .maybeSingle();

    // console.log(error);

    if (error) throw error;

    await logAdminActivity(req.user.id, "UPDATE_USER_STATUS", userId, "user", {
      oldStatus: user.status,
      newStatus: status,
      reason,
    });

    res.json({
      success: true,
      message: "User status updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error in updateUserStatus:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Vendor Management
exports.listBusinessProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from("business_profile")
      .select("*, users!owner_id(email, first_name,last_name,id)", {
        count: "exact",
      });

    if (status) query = query.eq("status", status);
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
      data: businessProfiles,
      count,
      error,
    } = await query
      .range(offset, offset + Number(limit) - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;
    // Uncomment the following lines if you want to log this activity
    // await logAdminActivity(req.admin.id, "LIST_BUSINESS_PROFILES", {
    //   filters: { status, search },
    // });

    res.json({
      success: true,
      businessProfiles,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
    });
  } catch (error) {
    console.error("Error in listVendors:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPendingVerifcationBusinessProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from("business_profile")
      .select("*", { count: "exact" })
      .eq("status", "pending_verification");

    if (search) {
      // adjust fields to match your schema (e.g. business_name, vendor_email)
      query = query.or(
        "business_name.ilike.%" +
          search +
          "%,business_email.ilike.%" +
          search +
          "%"
      );
    }

    const {
      data: businessProfiles,
      count,
      error,
    } = await query
      .range(offset, offset + Number(limit) - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Uncomment the following lines if you want to log this activity
    // await logAdminActivity(req.admin.id, "LIST_PENDING_BUSINESS_PROFILES", {
    //   filters: { search },
    // });

    res.json({
      success: true,
      businessProfiles,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
    });
  } catch (error) {
    console.error("getPendingBusinessProfiles error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.updateBusinessProfileStatus = async (req, res) => {
  try {
    const { businessProfileId } = req.params;
    const { status, reason } = req.body;

    if (
      !["pending_verification", "active", "rejected", "suspended"].includes(
        status
      )
    ) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const { data: businessAccount, error } = await supabase
      .from("business_profile")
      .update({
        status,
        status_update_reason: reason,
      })
      .eq("id", businessProfileId)
      .select()
      .single();

    if (error) throw error;

    // If vendor is approved, update user role to VENDOR
    if (status === "active") {
      await supabase
        .from("users")
        .update({ role: "vendor" })
        .eq("id", businessAccount.owner_id);
    }
    if (status === "suspended" || status === "rejected") {
      await supabase
        .from("users")
        .update({ role: "user" })
        .eq("id", businessAccount.owner_id);
    }

    await logAdminActivity(
      req.user.id,
      "UPDATE_BUSINESS_ACCOUNT_STATUS",
      businessProfileId,
      "business_profile",
      {
        oldStatus: businessAccount.status,
        newStatus: status,
        reason,
      }
    );

    res.json({
      success: true,
      message: "Business status updated successfully",
      businessAccount,
    });
  } catch (error) {
    console.error("Error in updateVendorStatus:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Analytics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get user statistics
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("role, status")
      .in("role", ["user", "vendor"]);

    if (userError) throw userError;

    // Get vendor statistics
    const { data: vendors, error: vendorError } = await supabase
      .from("business_profile")
      .select("status");

    if (vendorError) throw vendorError;

    // Get product statistics
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("status");

    if (productError) throw productError;

    const stats = {
      users: {
        total: users.length,
        active: users.filter((u) => u.status === "active").length,
        suspended: users.filter(
          (u) => u.role === "user" && u.status === "suspended"
        ).length,
        deleted: users.filter(
          (u) => u.role === "user" && u.status === "deleted"
        ).length,
      },
      businesses: {
        total: vendors.length,
        pending: vendors.filter((v) => v.status === "pending_verification")
          .length,
        active: vendors.filter((v) => v.status === "active").length,
        rejected: vendors.filter((v) => v.status === "rejected").length,
        suspended: vendors.filter((v) => v.status === "suspended").length,
      },
      products: {
        total: products.length,
        active: products.filter((p) => p.status === "active").length,
        inactive: products.filter((p) => p.status === "inactive").length,
        pending: products.filter((p) => p.status === "pending_review").length,
        rejected: products.filter((p) => p.status === "delete").length,
      },
    };
    // Uncomment the following lines if you want to log this activity
    // await logAdminActivity(req.admin.id, "VIEW_DASHBOARD_STATS");

    res.json({ success: true, stats });
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const { days = 30, type } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    let query = supabase
      .from("admin_log")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (type) {
      query = query.eq("action_type", type);
    }

    const { data: activities, error } = await query.limit(100);

    if (error) throw error;

    // await logAdminActivity(req.admin.id, "VIEW_RECENT_ACTIVITY", {
    //   days,
    //   type,
    // });

    res.json(activities);
  } catch (error) {
    console.error("Error in getRecentActivity:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get vendors grouped by region (top 5 states)
exports.getVendorsByRegion = async (req, res) => {
  try {
    const limit = Math.min(20, Number(req.query.limit || 5));

    // Get all active business profiles
    const { data: businessProfiles, error: businessError } = await supabase
      .from("business_profile")
      .select("id")
      .eq("status", "active");

    if (businessError) throw businessError;

    if (!businessProfiles || businessProfiles.length === 0) {
      return res.json({
        success: true,
        data: [],
        total_vendors: 0,
      });
    }

    const businessIds = businessProfiles.map((bp) => bp.id);

    // Get products with location_state for these business profiles
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("product_owner_id, location_state")
      .in("product_owner_id", businessIds)
      .not("location_state", "is", null);

    if (productsError) throw productsError;

    // Group vendors by state
    const stateVendorMap = {};
    const vendorStateMap = {}; // Track which state each vendor is in

    products.forEach((product) => {
      const state = product.location_state;
      const vendorId = product.product_owner_id;

      if (state && vendorId) {
        // Only count each vendor once per state
        if (!vendorStateMap[vendorId]) {
          vendorStateMap[vendorId] = state;
          stateVendorMap[state] = (stateVendorMap[state] || 0) + 1;
        } else if (vendorStateMap[vendorId] === state) {
          // Vendor already counted in this state
          return;
        }
      }
    });

    // Get state names
    const stateIds = Object.keys(stateVendorMap);

    if (stateIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        total_vendors: businessProfiles.length,
      });
    }

    const { data: states, error: statesError } = await supabase
      .from("state_location")
      .select("state_id, name")
      .in("state_id", stateIds);

    if (statesError) throw statesError;

    // Create state name lookup
    const stateNameMap = {};
    states.forEach((state) => {
      stateNameMap[state.state_id] = state.name;
    });

    // Calculate total vendors
    const totalVendors = businessProfiles.length;

    // Create result array with percentages
    const results = Object.entries(stateVendorMap).map(([stateId, count]) => ({
      state: stateNameMap[stateId] || stateId,
      state_id: stateId,
      vendors: count,
      percentage: totalVendors > 0 ? Math.round((count / totalVendors) * 100) : 0,
    }));

    // Sort by vendor count descending and limit
    results.sort((a, b) => b.vendors - a.vendors);
    const topResults = results.slice(0, limit);

    res.json({
      success: true,
      data: topResults,
      total_vendors: totalVendors,
    });
  } catch (error) {
    console.error("Error in getVendorsByRegion:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get product counts by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const limit = Math.min(20, Number(req.query.limit || 10));

    // Get all active categories
    const { data: categories, error: categoriesError } = await supabase
      .from("category")
      .select("id, name, slug")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (categoriesError) throw categoriesError;

    if (!categories || categories.length === 0) {
      return res.json({
        success: true,
        data: [],
        total_products: 0,
      });
    }

    // Count products for each category via junction table
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const { count, error: countError } = await supabase
          .from("product_categories")
          .select("*", { count: "exact", head: true })
          .eq("category_id", category.id);

        if (countError) {
          console.error(`Error counting products for category ${category.id}:`, countError);
          return {
            category: category.name,
            slug: category.slug,
            value: 0,
            fill: `hsl(var(--chart-1))`,
          };
        }

        return {
          category: category.name,
          slug: category.slug,
          value: count || 0,
          fill: `hsl(var(--chart-${(categories.indexOf(category) % 5) + 1}))`,
        };
      })
    );

    // Sort by count descending
    categoriesWithCounts.sort((a, b) => b.value - a.value);

    // Take top N categories
    const topCategories = categoriesWithCounts.slice(0, limit);

    // Calculate total products
    const totalProducts = categoriesWithCounts.reduce((sum, cat) => sum + cat.value, 0);

    res.json({
      success: true,
      data: topCategories,
      total_products: totalProducts,
    });
  } catch (error) {
    console.error("Error in getProductsByCategory:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get count of active locations (unique LGAs where products exist)
exports.getActiveLocationsCount = async (req, res) => {
  try {
    // Get all active products with location_lga
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("location_lga")
      .eq("status", "active")
      .not("location_lga", "is", null);

    if (productsError) throw productsError;

    // Count unique location_lga values
    const uniqueLGAs = new Set();
    products.forEach((product) => {
      if (product.location_lga) {
        uniqueLGAs.add(product.location_lga);
      }
    });

    const count = uniqueLGAs.size;

    res.json({
      success: true,
      count,
      total_products: products.length,
    });
  } catch (error) {
    console.error("Error in getActiveLocationsCount:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
