const router = require("express").Router();
const User = require("../models/user");
const Song = require("../models/song");
const ApiResponse = require("../src/utils/apiResponse");
const { asyncHandler, authenticate, requireMember } = require("../src/middleware");

/**
 * @route   GET /api/favourites/check/:songId
 * @desc    Check if authenticated member has favourited the song
 * @access  Private (member)
 */
router.get(
  "/check/:songId",
  authenticate,
  requireMember,
  asyncHandler(async (req, res) => {
    const { songId } = req.params;

    if (!songId) {
      return ApiResponse.validationError(res, null, "Song ID is required");
    }

    const user = await User.findById(req.user._id).select("favourites").lean();
    if (!user) return ApiResponse.notFound(res, "User not found");

    const isFavourite = (user.favourites || []).some(
      (id) => id.toString() === songId.toString(),
    );

    return ApiResponse.success(res, { isFavourite }, "Checked favourites");
  }),
);

/**
 * @route   POST /api/favourites/add
 * @desc    Add a song to authenticated member's favourites
 * @access  Private (member)
 * @body    { songId }
 */
router.post(
  "/add",
  authenticate,
  requireMember,
  asyncHandler(async (req, res) => {
    const { songId } = req.body;
    if (!songId) return ApiResponse.validationError(res, null, "Song ID is required");

    const song = await Song.findById(songId).lean();
    if (!song) return ApiResponse.notFound(res, "Song not found");

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { favourites: songId } },
      { new: true },
    ).select("favourites");

    return ApiResponse.created(res, { favourites: updated.favourites }, "Song added to favourites");
  }),
);

/**
 * @route   DELETE /api/favourites/remove/:songId
 * @desc    Remove a song from authenticated member's favourites
 * @access  Private (member)
 */
router.delete(
  "/remove/:songId",
  authenticate,
  requireMember,
  asyncHandler(async (req, res) => {
    const { songId } = req.params;
    if (!songId) return ApiResponse.validationError(res, null, "Song ID is required");

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { favourites: songId } },
      { new: true },
    ).select("favourites");

    return ApiResponse.success(res, { favourites: updated.favourites }, "Song removed from favourites");
  }),
);

/**
 * @route   GET /api/favourites/list
 * @desc    Get paginated list of authenticated member's favourite songs (limit 6)
 * @access  Private (member)
 * @query   page (optional, default 1)
 */
router.get(
  "/list",
  authenticate,
  requireMember,
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 6;

    const user = await User.findById(req.user._id).select("favourites").lean();
    if (!user) return ApiResponse.notFound(res, "User not found");

    const total = (user.favourites || []).length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const start = (page - 1) * limit;
    const pageIds = (user.favourites || []).slice(start, start + limit);

    // Fetch songs and preserve order from user's favourites array
    const songsFound = await Song.find({ _id: { $in: pageIds } }).lean();
    const songMap = new Map(songsFound.map((s) => [s._id.toString(), s]));
    const songs = pageIds.map((id) => songMap.get(id.toString())).filter(Boolean);

    return ApiResponse.success(res, {
      songs,
      page,
      limit,
      total,
      totalPages,
    }, "Favourite songs retrieved");
  }),
);

/**
 * @route   GET /api/favourites/search
 * @desc    Search authenticated member's favourite songs by name (limit 6)
 * @access  Private (member)
 * @query   q, page (optional)
 */
router.get(
  "/search",
  authenticate,
  requireMember,
  asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 6;

    const user = await User.findById(req.user._id).select("favourites").lean();
    if (!user) return ApiResponse.notFound(res, "User not found");

    const favIds = (user.favourites || []).map((id) => id.toString());

    if (favIds.length === 0) {
      return ApiResponse.success(res, { songs: [], page, limit, total: 0, totalPages: 0 }, "No favourites");
    }

    const filter = { _id: { $in: favIds } };
    if (q) {
      filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    const total = await Song.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const songsFound = await Song.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("artist", "name imageURL")
      .lean();

    return ApiResponse.success(res, { songs: songsFound, page, limit, total, totalPages }, "Search results");
  }),
);

module.exports = router;

