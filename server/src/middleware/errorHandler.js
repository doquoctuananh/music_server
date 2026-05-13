/**
 * Global Error Handler Middleware
 * Catches all unhandled errors and returns consistent error responses
 *
 * USAGE: Must be the LAST middleware registered in app.js
 * app.use(errorHandler);
 */

/**
 * Express error handling middleware
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = null;

  // Handle specific error types
  if (err.name === "ValidationError") {
    // Mongoose validation error
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.name === "CastError") {
    // Mongoose invalid ObjectId
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    // Mongoose duplicate key error
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for ${field}`;
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Log error for debugging (only in development)
  if (process.env.NODE_ENV !== "production") {
    console.error(`[ERROR] ${statusCode} - ${message}`, err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
    // Only include stack trace in development
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * Eliminates the need for try-catch in every route
 *
 * USAGE: router.get("/songs", asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom API Error class for throwing controlled errors
 *
 * USAGE: throw new ApiError(404, "Song not found");
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
  }
}

module.exports = { errorHandler, asyncHandler, ApiError };
