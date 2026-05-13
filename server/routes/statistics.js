/**
 * Statistics Routes
 * Admin-only endpoints for system statistics
 */

const router = require("express").Router();
const User = require("../models/user");
const ApiResponse = require("../src/utils/apiResponse");
const { authenticate, requireAdmin, asyncHandler } = require("../src/middleware");

/**
 * @route   GET /api/statistics/users
 * @desc    Get user statistics (total members + created today)
 * @access  Private/Admin
 */
router.get(
  "/users",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    // Total members
    const totalMembers = await User.countDocuments({ role: "member" });

    // Users created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const usersCreatedToday = await User.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
    });

    return ApiResponse.success(
      res,
      {
        totalMembers,
        createdToday: usersCreatedToday,
      },
      "User statistics retrieved successfully"
    );
  })
);

module.exports = router;
