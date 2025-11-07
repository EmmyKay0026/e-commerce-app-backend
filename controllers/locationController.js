const { supabase } = require("../config/supabaseClient");

// List all states
exports.listStates = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("state_location")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch states", error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// List all LGAs for a given state
exports.listLgas = async (req, res) => {
  try {
    const { state_id } = req.params;
    const { data, error } = await supabase
      .from("lga_location")
      .select("*")
      .eq("state_id", state_id)
      .order("name", { ascending: true });
    if (error) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch LGAs", error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get a single state by id
exports.getState = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("state_location")
      .select("*")
      .eq("state_id", id)

      .single();
    if (error) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch state", error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get a single LGA by id
exports.getLga = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("lga_location")
      .select("*")
      .eq("lga_id", id)
      .single();
    if (error) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch LGA", error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Search for locations
exports.searchLocations = async (req, res) => {
  try {
    const { q } = req.query;
    const { data: states, error: stateError } = await supabase
      .from("state_location")
      .select("*")
      .ilike("name", `%${q}%`);
    const { data: lgas, error: lgaError } = await supabase
      .from("lga_location")
      .select("*")
      .ilike("name", `%${q}%`);

    if (stateError || lgaError) {
      return res.status(500).json({
        success: false,
        message: "Failed to search locations",
        error: stateError || lgaError,
      });
    }

    return res.json({ success: true, data: { states, lgas } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// List all LGAs
exports.listAllLgas = async (req, res) => {
  try {
    const { data, error } = await supabase.from("lga_location").select("*");
    if (error) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch LGAs", error });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all states with their LGAs
exports.listStatesWithLgas = async (req, res) => {
  try {
    const { data: states, error: statesError } = await supabase
      .from("state_location")
      .select("*, lgas:lga_location(*)")
      .order("name", { ascending: true });

    if (statesError) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch data",
        error: statesError,
      });
    }

    return res.json({ success: true, data: states });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
