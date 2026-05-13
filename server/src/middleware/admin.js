/**
 * Admin Authorization Middleware
 * Requires authenticated request (use after auth middleware)
 *
 * USAGE: router.delete("/song/:id", authenticate, requireAdmin, deleteHandler);
 */

/**
 * Middleware to require admin role for protected admin-only routes
 * MUST be used AFTER authenticate middleware
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const requireAdmin = async (req, res, next) => {
  // Ensure authenticate middleware ran first
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      error:
        "No user context found - ensure authenticate middleware is applied first",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
      error: "You do not have permission to perform this action",
      timestamp: new Date().toISOString(),
    });
  }

  // Attach full database user to request for use in handlers
  // In our simplified JWT flow, req.user is already the DB user
  req.dbUser = req.user;
  next();
};

/**
 * Middleware to require member role for member-only routes
 * MUST be used AFTER authenticate middleware
 */
const requireMember = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      error:
        "No user context found - ensure authenticate middleware is applied first",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.user.role !== "member") {
    return res.status(403).json({
      success: false,
      message: "Member access required",
      error: "You do not have permission to perform this action",
      timestamp: new Date().toISOString(),
    });
  }

  req.dbUser = req.user;
  next();
};

/**
 * Middleware to attach database user to request (for any authenticated user)
 * Useful when you need the full user record, not just token data
 */
const attachDbUser = async (req, res, next) => {
  if (req.user) {
    req.dbUser = req.user;
  }
  next();
};

module.exports = { requireAdmin, requireMember, attachDbUser };

