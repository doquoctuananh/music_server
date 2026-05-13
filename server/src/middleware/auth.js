const jwt = require("jsonwebtoken");
const User = require("../../models/user");

/**
 * Middleware to authenticate requests using JWT tokens
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      error: "Missing or malformed authorization header",
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "spotify_secret_123");

    // Look up user in MongoDB
    const dbUser = await User.findById(decoded.id).select("-password").lean();

    if (!dbUser) {
      return res.status(401).json({
        success: false,
        message: "User not found",
        error: "invalid-token",
      });
    }

    req.user = dbUser;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.name === "TokenExpiredError" ? "token-expired" : "invalid-token",
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "spotify_secret_123");
    const dbUser = await User.findById(decoded.id).select("-password").lean();
    if (dbUser) {
      req.user = dbUser;
    }
  } catch {
    // Silently continue
  }

  next();
};

module.exports = { authenticate, optionalAuth };
