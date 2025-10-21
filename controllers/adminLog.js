const { supabase } = require("../config/supabaseClient");

// const VALID_TARGET_TYPES = [
//     "product",
//     "user",
//     "business_profile",
//     "category",
// ];

// function isValidTargetType(type) {
//     return VALID_TARGET_TYPES.includes(type);
// }

// Log admin activity
exports.logAdminActivity = async (
  adminId,
  action,
  targetId,
  targetType,
  details = {}
) => {
  try {
    const { error } = await supabase.from("admin_log").insert({
      admin_id: adminId,
      action,
      target_id: targetId,
      target_type: targetType,
      details,
      created_at: new Date().toISOString(),
    });
    //   ip_address: "0.0.0.0", // In a real app, you would get this from the request

    if (error) {
      console.error("Error logging admin activity:", error);
      //   throw error;
    }
  } catch (error) {
    console.error("Failed to log admin activity:", error);
    // Don't throw here to prevent disrupting the main operation
  }
};

// List admin activity logs with filtering and pagination
exports.listLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      adminId,
      action,
      startDate,
      endDate,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Build query
    let query = supabase.from("admin_log").select(`
        id,
        admin_id,
        action,
        details,
        ip_address,
        created_at,
        admins:admin_id (
          email
        )
      `);

    // Apply filters
    if (adminId) query = query.eq("admin_id", adminId);
    if (action) query = query.eq("action", action);
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);

    // Get paginated results
    const { data: logs, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error)
      return res.status(500).json({ message: "Failed to fetch logs", error });

    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Get single log entry
exports.getLog = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: log, error } = await supabase
      .from("admin_log")
      .select(
        `
        id,
        admin_id,
        action,
        details,
        ip_address,
        created_at,
        admins:admin_id (
          email
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error)
      return res.status(500).json({ message: "Failed to fetch log", error });
    if (!log) return res.status(404).json({ message: "Log not found" });

    return res.json(log);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Get activity summary (count by action type, timeline data)
exports.getActivitySummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    // Get action counts
    const { data: actionCounts, error: countError } = await supabase
      .from("admin_log")
      .select("action, count", { count: "exact" })
      .match(dateFilter)
      .group("action");

    if (countError)
      return res
        .status(500)
        .json({ message: "Failed to fetch summary", error: countError });

    // Get timeline data (daily counts)
    const { data: timeline, error: timelineError } = await supabase
      .from("admin_log")
      .select("created_at, count", { count: "exact" })
      .match(dateFilter)
      .group("created_at::date")
      .order("created_at");

    if (timelineError)
      return res
        .status(500)
        .json({ message: "Failed to fetch timeline", error: timelineError });

    return res.json({
      actionCounts,
      timeline,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
