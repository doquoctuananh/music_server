/**
 * Playlist Routes
 *
 * All playlist operations require authentication
 * Users can only manage their own playlists
 */
const router = require("express").Router();
const Playlist = require("../models/playlist");
const ApiResponse = require("../src/utils/apiResponse");
const { authenticate, asyncHandler } = require("../src/middleware");

/**
 * @route   POST /api/playlists/savePlaylist
 * @desc    Create a new playlist
 * @access  Private
 */
router.post(
  "/savePlaylist",
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, imageURL, songs = [] } = req.body;

    if (!name) {
      return ApiResponse.validationError(
        res,
        null,
        "Playlist name is required",
      );
    }

    const newPlaylist = new Playlist({
      name,
      imageURL,
      songs: songs.map((songId) => ({
        songId,
        addedAt: Date.now(),
      })),
      user: req.user._id, // Associate with authenticated user's MongoDB _id
    });

    const savedPlaylist = await newPlaylist.save();
    return ApiResponse.created(
      res,
      savedPlaylist,
      "Playlist created successfully",
    );
  }),
);

/**
 * @route   GET /api/playlists/getall
 * @desc    Get all playlists for the authenticated user
 * @access  Private
 */
router.get(
  "/getall",
  authenticate,
  asyncHandler(async (req, res) => {
    // Only return playlists belonging to the authenticated user
    const playlists = await Playlist.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return ApiResponse.success(
      res,
      playlists,
      "Playlists retrieved successfully",
    );
  }),
);

/**
 * @route   GET /api/playlists/getplaylist/:id
 * @desc    Get a single playlist by ID
 * @access  Private (owner only)
 */
router.get(
  "/getplaylist/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const playlist = await Playlist.findById(req.params.id).lean();

    if (!playlist) {
      return ApiResponse.notFound(res, "Playlist not found");
    }

    // Check ownership (use toString() to handle ObjectId vs String comparison)
    if (playlist.user.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, "You can only view your own playlists");
    }

    return ApiResponse.success(
      res,
      playlist,
      "Playlist retrieved successfully",
    );
  }),
);

/**
 * @route   PUT /api/playlists/update/:id
 * @desc    Update playlist name and image
 * @access  Private (owner only)
 */
router.put(
  "/update/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, imageURL } = req.body;

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return ApiResponse.notFound(res, "Playlist not found");
    }

    // Check ownership (use toString() to handle ObjectId vs String comparison)
    if (playlist.user.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(
        res,
        "You can only update your own playlists",
      );
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      req.params.id,
      { name, imageURL },
      { new: true },
    );

    return ApiResponse.success(
      res,
      updatedPlaylist,
      "Playlist updated successfully",
    );
  }),
);

/**
 * @route   PUT /api/playlists/update/:id/add
 * @desc    Add a song to playlist
 * @access  Private (owner only)
 */
router.put(
  "/update/:id/add",
  authenticate,
  asyncHandler(async (req, res) => {
    const { songId } = req.body;

    if (!songId) {
      return ApiResponse.validationError(res, null, "Song ID is required");
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return ApiResponse.notFound(res, "Playlist not found");
    }

    // Check ownership (use toString() to handle ObjectId vs String comparison)
    if (playlist.user.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(
        res,
        "You can only modify your own playlists",
      );
    }

    // Check if song already exists
    const songExists = playlist.songs.some((item) => item.songId === songId);
    if (songExists) {
      return ApiResponse.success(res, playlist, "Song already in playlist");
    }

    playlist.songs.push({ songId, addedAt: Date.now() });
    const updatedPlaylist = await playlist.save();

    return ApiResponse.success(res, updatedPlaylist, "Song added to playlist");
  }),
);

/**
 * @route   PUT /api/playlists/update/:id/remove
 * @desc    Remove a song from playlist
 * @access  Private (owner only)
 */
router.put(
  "/update/:id/remove",
  authenticate,
  asyncHandler(async (req, res) => {
    const { songId } = req.body;

    if (!songId) {
      return ApiResponse.validationError(res, null, "Song ID is required");
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return ApiResponse.notFound(res, "Playlist not found");
    }

    // Check ownership (use toString() to handle ObjectId vs String comparison)
    if (playlist.user.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(
        res,
        "You can only modify your own playlists",
      );
    }

    playlist.songs = playlist.songs.filter((item) => item.songId !== songId);
    const updatedPlaylist = await playlist.save();

    return ApiResponse.success(
      res,
      updatedPlaylist,
      "Song removed from playlist",
    );
  }),
);

/**
 * @route   DELETE /api/playlists/deleteplaylist/:id
 * @desc    Delete a playlist
 * @access  Private (owner only)
 */
router.delete(
  "/deleteplaylist/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return ApiResponse.notFound(res, "Playlist not found");
    }

    // Check ownership (use toString() to handle ObjectId vs String comparison)
    if (playlist.user.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(
        res,
        "You can only delete your own playlists",
      );
    }

    await Playlist.findByIdAndDelete(req.params.id);

    return ApiResponse.success(res, null, "Playlist deleted successfully");
  }),
);

module.exports = router;
