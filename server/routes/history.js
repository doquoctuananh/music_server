/**
 * Listening History Routes
 *
 * AUTHENTICATED: POST /add, GET /getall, DELETE /clear, DELETE /:entryId, GET /today
 * ADMIN: GET /stats-today
 */
const router = require("express").Router();
const ListeningHistory = require("../models/listeningHistory");
const Song = require("../models/song");
const ApiResponse = require("../src/utils/apiResponse");
const { authenticate, requireAdmin, requireMember, asyncHandler } = require("../src/middleware");

/**
 * @route   POST /api/history/add
 * @desc    Record a song play in user's listening history
 * @access  Private (requires authentication)
 * @body    {
 *   song: ObjectId (required - Song ID)
 * }
 */
router.post(
  "/add",
  authenticate,
  requireMember,
  asyncHandler(async (req, res) => {
    const { song } = req.body;

    if (!song) {
      return ApiResponse.validationError(res, null, "Song ID is required");
    }

    // Validate song exists
    const songExists = await Song.findById(song);
    if (!songExists) {
      return ApiResponse.error(res, "Song not found", 404);
    }

    // Create history entry
    const entry = new ListeningHistory({
      user: req.user._id,
      song,
    });

    const saved = await entry.save();
    
    // Increment song playCount
    await Song.findByIdAndUpdate(song, { $inc: { playCount: 1 } });

    // Populate song info before returning
    const populated = await ListeningHistory.findById(saved._id)
      .populate("song", "name imageURL artist")
      .lean();

    return ApiResponse.created(res, populated, "Song added to listening history");
  })
);

/**
 * @route   GET /api/history/getall?page=1&limit=10
 * @desc    Get user's listening history with pagination (most recent first)
 * @access  Private (requires authentication)
 * @query   page (default: 1), limit (default: 10, max: 50)
 */
router.get(
  "/getall",
  authenticate,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 10, 50)); // Max 50
    const skip = (page - 1) * limit;

    const total = await ListeningHistory.countDocuments({ user: req.user._id });
    const totalPages = Math.ceil(total / limit);

    const history = await ListeningHistory.find({ user: req.user._id })
      .populate("song", "name imageURL artist album duration")
      .sort({ playedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return ApiResponse.success(
      res,
      {
        history,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      "Listening history retrieved successfully"
    );
  })
);

/**
 * @route   DELETE /api/history/clear
 * @desc    Clear user's entire listening history
 * @access  Private (requires authentication)
 */
router.delete(
  "/clear",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await ListeningHistory.deleteMany({ user: req.user._id });

    return ApiResponse.success(
      res,
      { deletedCount: result.deletedCount },
      `Deleted ${result.deletedCount} history entry(ies)`
    );
  })
);

/**
 * @route   DELETE /api/history/:entryId
 * @desc    Delete specific history entry
 * @access  Private (requires authentication)
 */
router.delete(
  "/:entryId",
  authenticate,
  asyncHandler(async (req, res) => {
    const entry = await ListeningHistory.findById(req.params.entryId);

    if (!entry) {
      return ApiResponse.notFound(res, "History entry not found");
    }

    if (entry.user.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, "You can only delete your own history");
    }

    await ListeningHistory.findByIdAndDelete(req.params.entryId);

    return ApiResponse.success(res, null, "History entry deleted");
  })
);

/**
 * @route   GET /api/history/today
 * @desc    Get user's listening count for today
 * @access  Private (requires authentication)
 */
router.get(
  "/today",
  authenticate,
  asyncHandler(async (req, res) => {
    // Get today's date range (00:00:00 to 23:59:59)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count user's plays today
    const todayCount = await ListeningHistory.countDocuments({
      user: req.user._id,
      playedAt: { $gte: today, $lt: tomorrow }
    });

    // Get detailed info
    const todayHistory = await ListeningHistory.find({
      user: req.user._id,
      playedAt: { $gte: today, $lt: tomorrow }
    })
      .populate("song", "name imageURL artist")
      .sort({ playedAt: -1 })
      .lean();

    return ApiResponse.success(
      res,
      {
        date: today.toISOString().split('T')[0],
        listeningCount: todayCount,
        plays: todayHistory
      },
      `You listened ${todayCount} song(s) today`
    );
  })
);

/**
 * @route   GET /api/history/stats-today
 * @desc    Get total listening count for today across all users (admin only)
 * @access  Private/Admin
 */
router.get(
  "/stats-today",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    // Get today's date range (00:00:00 to 23:59:59)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count all plays today
    const totalListensToday = await ListeningHistory.countDocuments({
      playedAt: { $gte: today, $lt: tomorrow }
    });

    // Get unique users who played today
    const uniqueUsersToday = await ListeningHistory.distinct("user", {
      playedAt: { $gte: today, $lt: tomorrow }
    });

    // Get top 5 songs played today
    const topSongsToday = await ListeningHistory.aggregate([
      {
        $match: {
          playedAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: "$song",
          playCount: { $sum: 1 }
        }
      },
      {
        $sort: { playCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: "songs",
          localField: "_id",
          foreignField: "_id",
          as: "songInfo"
        }
      },
      {
        $unwind: "$songInfo"
      },
      {
        $project: {
          _id: 1,
          songName: "$songInfo.name",
          playCount: 1
        }
      }
    ]);

    return ApiResponse.success(
      res,
      {
        date: today.toISOString().split('T')[0],
        totalListens: totalListensToday,
        uniqueUsers: uniqueUsersToday.length,
        topSongs: topSongsToday
      },
      `Total ${totalListensToday} listens today from ${uniqueUsersToday.length} user(s)`
    );
  })
);

module.exports = router;
