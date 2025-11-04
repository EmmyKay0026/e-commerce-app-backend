const express = require("express");
const cors = require("cors");
const productRoutes = require("./routes/products");
const userRoutes = require("./routes/users");
const vendorRoutes = require("./routes/vendors");
const categoryRoutes = require("./routes/category");
const adminLogRoutes = require("./routes/adminLog");
const locationRoutes = require("./routes/location");
const fileUploadRoute = require("./routes/fileUpload");
const adminDashboardRoutes = require("./routes/adminDashboard");

require("dotenv").config();

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:3000",
      "https://e-commerce-app-frontend-taupe.vercel.app",
      "http://industrialmart.ng",
      "http://www.industrialmart.ng",
      "https://www.industrialmart.ng",
      "https://industrialmart.ng",
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Idempotency-Key",
    "X-Cohort-Context",
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Middleware
app.use(cors(corsOptions));
// app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Product routes
app.use("/api/products", productRoutes);

// User routes

app.use("/api/users", userRoutes);

// Vendor routes
app.use("/api/businessProfile", vendorRoutes);

// Category routes
app.use("/api/categories", categoryRoutes);

// Location routes

app.use("/api/location", locationRoutes);

//Image upload route
app.use("/api/upload", fileUploadRoute);

// Admin routes (separate authentication)
app.use("/api/admin/logs", adminLogRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);

// Simple route
app.get("/", (req, res) => {
  res.send("API is running");
});
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
