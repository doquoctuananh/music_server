/**
 * MusicApp Server
 *
 * Express server with MongoDB and JWT authentication
 *
 * ARCHITECTURE:
 * - All routes use standardized ApiResponse format
 * - Protected routes use authenticate/requireAdmin middleware
 * - Global error handler catches all unhandled errors
 */
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv/config");

const path = require("path");

const { errorHandler } = require("./src/middleware");

const app = express();

// CORS configuration
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (mp3, images) from NhacCuaTui
app.use(express.static(path.join(__dirname, "public")));

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "MusicApp API is running",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
const userRoute = require("./routes/auth");
const songRoutes = require("./routes/songs");
const uploadRoutes = require("./routes/upload");
const artistRoutes = require("./routes/artists");
const albumRoutes = require("./routes/albums");
const playlistRoutes = require("./routes/playlist");
const historyRoutes = require("./routes/history");
const recommendationRoutes = require("./routes/recommendations");
const statisticsRoutes = require("./routes/statistics");
const favouritesRoutes = require("./routes/favourites");

app.use("/api/users", userRoute);
app.use("/api/songs", songRoutes);
app.use("/api/songs", uploadRoutes);
app.use("/api/artists", artistRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/favourites", favouritesRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler (MUST be last middleware)
app.use(errorHandler);

// Database connection
mongoose
  .connect(process.env.DB_STRING)
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed.");
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
});
