const express = require("express");
const cors = require("cors");
const productRoutes = require("./routes/products");
const userRoutes = require("./routes/users");
const vendorRoutes = require("./routes/vendors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple route
app.get("/", (req, res) => {
  res.send("API is running");
});

// Product routes
app.use("/api/products", productRoutes);

// User routes

app.use("/api/users", userRoutes);

// Vendor routes
app.use("/api/vendors", vendorRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
