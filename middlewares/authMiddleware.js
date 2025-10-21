const { supabase } = require("../config/supabaseClient");

exports.authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const { data: user, error } = await supabase.auth.getUser(token);
  //   console.log(user);

  if (error || !user) return res.status(401).json({ message: "Invalid token" });

  req.user = user.user;
  next();
};

// Optional authentication middleware
// Will not return 401 if no token is present
exports.optionalAuthMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    // No token, continue without user
    req.user = null;
    return next();
  }

  try {
    const { data: user, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Invalid token, continue without user
      req.user = null;
      return next();
    }

    req.user = user.user;
    next();
  } catch (error) {
    // Error checking token, continue without user
    req.user = null;
    next();
  }
};

exports.requireRole =
  (...roles) =>
  async (req, res, next) => {
    const { data: userRole, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", req.user.id);

    const role = userRole[0].role;

    if (!req.user || !roles.includes(role))
      return res.status(403).json({ message: "Access denied" });
    next();
  };
