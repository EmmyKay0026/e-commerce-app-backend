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

exports.requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });
    next();
  };
