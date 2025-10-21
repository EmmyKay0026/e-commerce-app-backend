const { success } = require("zod");
const { supabase } = require("../config/supabaseClient");
const { logAdminActivity } = require("./adminLog");

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
