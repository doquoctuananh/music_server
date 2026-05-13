/**
 * Middleware Index
 * Central export for all middleware functions
 */

const { authenticate, optionalAuth } = require("./auth");
const { requireAdmin, requireMember, attachDbUser } = require("./admin");
const { errorHandler, asyncHandler, ApiError } = require("./errorHandler");
const { optionalImageUpload } = require("./upload");

module.exports = {
  // Authentication
  authenticate,
  optionalAuth,

  // Authorization
  requireAdmin,
  requireMember,
  attachDbUser,

  // Error Handling
  errorHandler,
  asyncHandler,
  ApiError,

  // File Upload
  optionalImageUpload,
};
