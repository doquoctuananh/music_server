/**
 * Albums Management Routes (CRUD)
 *
 * PUBLIC: GET /getall, GET /getone/:id, GET /stats, GET /search
 * ADMIN: POST /add, PUT /:id (with image upload), DELETE /:id, PUT /:id/upload
 */
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Album = require("../models/album");
const Artist = require("../models/artist");
const Song = require("../models/song");
const ApiResponse = require("../src/utils/apiResponse");
const { asyncHandler, authenticate, requireAdmin, requireMember } = require("../src/middleware");

/**
 * Helper function to delete old image file
 */
const deleteOldImage = (imagePath) => {
  if (!imagePath) return;

  try {
    const fullPath = path.join(__dirname, "../public", imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Deleted old image: ${imagePath}`);
    }
  } catch (err) {
    console.error(`❌ Error deleting image: ${err.message}`);
  }
};

// Multer storage for album images
const uploadAlbumImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, "../public/images/albums");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const name = file.originalname
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .toLowerCase();
      cb(null, `${Date.now()}_${name}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WebP images allowed"), false);
    }
  }
}).single("imageFile");

/**
 * @route   GET /api/albums/getall?page=1&limit=6
 * @desc    Get all albums with pagination (6 albums per page)
 * @access  Admin
 * @query   page (default: 1), limit (default: 6, max: 6)
 */
router.get(
  "/getall",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 6, 6)); // Default: 6, Max: 6
    const skip = (page - 1) * limit;

    const total = await Album.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const albums = await Album.find()
      .populate("artist", "name imageURL")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return ApiResponse.success(
      res,
      {
        albums,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      "Albums retrieved successfully"
    );
  })
);

/**
 * @route   GET /api/albums/getone/:id
 * @desc    Get single album by ID
 * @access  Admin
 */
router.get(
  "/getone/:id",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const album = await Album.findById(req.params.id)
      .populate("artist", "name imageURL")
      .lean();

    if (!album) {
      return ApiResponse.notFound(res, "Album not found");
    }

    return ApiResponse.success(res, album, "Album retrieved successfully");
  })
);

/**
 * @route   GET /api/albums/all?page=1&limit=6
 * @desc    Get albums with pagination (member access, default/max limit 6)
 * @access  Member
 */
router.get(
  "/all",
  authenticate,
  // allow both admin and member roles
  (req, res, next) => {
    if (!req.user) return ApiResponse.unauthorized(res, "Authentication required");
    if (req.user.role !== "admin" && req.user.role !== "member") {
      return ApiResponse.forbidden(res, "Member or admin access required");
    }
    req.dbUser = req.user;
    next();
  },
  asyncHandler(async (req, res) => {
    const albums = await Album.find()
      .populate("artist", "name imageURL")
      .sort({ createdAt: -1 })
      .lean();

    const total = albums.length;

    return ApiResponse.success(
      res,
      {
        albums,
        total,
        message: `Retrieved ${total} album(s)`
      },
      "All albums retrieved successfully"
    );
  })
);

/**
 * @route   POST /api/albums/add
 * @desc    Create new album with optional image (admin only)
 * @access  Private/Admin
 * @body    {
 *   name: String (required)
 *   artist: ObjectId (optional)
 *   imageFile: File (optional, image)
 * }
 */
router.post(
  "/add",
  authenticate,
  requireAdmin,
  uploadAlbumImage,
  asyncHandler(async (req, res) => {
    const { name, artist } = req.body;

    if (!name) {
      return ApiResponse.validationError(res, null, "Album name is required");
    }

    // Validate artist if provided
    let artistId = null;
    if (artist) {
      const artistDoc = await Artist.findById(artist);
      if (!artistDoc) {
        return ApiResponse.error(res, `Artist not found: ${artist}`, 400);
      }
      artistId = artist;
    }

    // Set imageURL if file uploaded, otherwise empty
    let imageURL = "";
    if (req.file) {
      imageURL = `/images/albums/${req.file.filename}`;
    }

    const album = await Album.create({
      name,
      artist: artistId,
      imageURL
    });

    return ApiResponse.created(
      res,
      {
        _id: album._id,
        name: album.name,
        artist: album.artist,
        imageURL: album.imageURL
      },
      "Album created successfully"
    );
  })
);

/**
 * @route   PUT /api/albums/:id
 * @desc    Update album info and/or image (admin only)
 * @access  Private/Admin
 * @body    {
 *   name: String (optional)
 *   artist: ObjectId (optional)
 *   imageFile: File (optional - JPG/PNG/WebP, max 50MB)
 * }
 */
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  uploadAlbumImage,
  asyncHandler(async (req, res) => {
    const album = await Album.findById(req.params.id);

    if (!album) {
      return ApiResponse.notFound(res, "Album not found");
    }

    const { name, artist } = req.body;

    if (name) album.name = name;

    if (artist !== undefined) {
      if (artist) {
        const artistDoc = await Artist.findById(artist);
        if (!artistDoc) {
          return ApiResponse.error(res, `Artist not found: ${artist}`, 400);
        }
        album.artist = artist;
      } else {
        album.artist = null;
      }
    }

    // Handle image file upload
    if (req.file) {
      // Delete old image if exists
      if (album.imageURL) {
        deleteOldImage(album.imageURL);
      }
      album.imageURL = `/images/albums/${req.file.filename}`;
    }

    await album.save();

    return ApiResponse.success(
      res,
      {
        _id: album._id,
        name: album.name,
        artist: album.artist,
        imageURL: album.imageURL
      },
      "Album updated successfully"
    );
  })
);

/**
 * @route   DELETE /api/albums/:id
 * @desc    Delete album and remove album reference from all songs (admin only)
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const albumId = req.params.id;
    const album = await Album.findById(albumId);

    if (!album) {
      return ApiResponse.notFound(res, "Album not found");
    }

    // Delete image file if exists
    if (album.imageURL) {
      deleteOldImage(album.imageURL);
    }

    // Remove album reference from all songs (set album to null)
    const songsUpdated = await Song.updateMany(
      { album: albumId },
      { $unset: { album: "" } }
    );

    console.log(`✅ Removed album reference from ${songsUpdated.modifiedCount} song(s)`);

    // Delete album
    await Album.findByIdAndDelete(albumId);

    return ApiResponse.success(
      res,
      { _id: albumId },
      `Album deleted successfully. Updated ${songsUpdated.modifiedCount} song(s)`
    );
  })
);

/**
 * @route   PUT /api/albums/:id/upload
 * @desc    Upload/update album image (admin only)
 * @access  Private/Admin
 */
router.put(
  "/:id/upload",
  authenticate,
  requireAdmin,
  uploadAlbumImage,
  asyncHandler(async (req, res) => {
    const album = await Album.findById(req.params.id);

    if (!album) {
      return ApiResponse.notFound(res, "Album not found");
    }

    if (!req.file) {
      return ApiResponse.error(res, "Image file is required", 400);
    }

    // Delete old image if exists
    if (album.imageURL) {
      deleteOldImage(album.imageURL);
    }

    album.imageURL = `/images/albums/${req.file.filename}`;
    await album.save();

    return ApiResponse.success(
      res,
      {
        _id: album._id,
        name: album.name,
        artist: album.artist,
        imageURL: album.imageURL
      },
      "Album image uploaded successfully"
    );
  })
);

/**
 * @route   GET /api/albums/stats
 * @desc    Get album statistics
 * @access  Admin
 */
router.get(
  "/stats",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const total = await Album.countDocuments();
    const totalSongs = await Song.countDocuments({ album: { $ne: null } });

    return ApiResponse.success(
      res,
      {
        totalAlbums: total,
        totalSongs: totalSongs,
        message: `Total ${total} album(s) with ${totalSongs} song(s)`
      },
      "Album statistics retrieved successfully"
    );
  })
);

/**
 * @route   GET /api/albums/search?q=keyword&page=1&limit=6
 * @desc    Search albums by name
 * @access  Public
 * @query   q - Search keyword (required)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 6, max: 6)
 */
router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return ApiResponse.validationError(res, null, "Search keyword is required");
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 6, 6)); // Default: 6, Max: 6
    const skip = (page - 1) * limit;

    // Search using regex for case-insensitive search
    const searchQuery = { name: { $regex: q, $options: "i" } };

    const total = await Album.countDocuments(searchQuery);
    const albums = await Album.find(searchQuery)
      .populate("artist", "name imageURL")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success(
      res,
      {
        albums,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      "Search results retrieved successfully"
    );
  })
);

module.exports = router;

/**
 * @route   GET /api/albums/:id/songs?page=1&limit=6
 * @desc    Get paginated songs for a specific album (limit max 6)
 * @access  Public
 */
router.get(
  "/:id/songs",
  authenticate,
  requireMember,
  asyncHandler(async (req, res) => {
    const albumId = req.params.id;

    const album = await Album.findById(albumId).lean();
    if (!album) {
      return ApiResponse.notFound(res, "Album not found");
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 6, 6)); // default 6, max 6
    const skip = (page - 1) * limit;

    const filter = { album: albumId };
    const total = await Song.countDocuments(filter);

    const songs = await Song.find(filter)
      .populate("artist", "name imageURL")
      .populate("album", "name imageURL")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return ApiResponse.success(
      res,
      {
        album: { _id: album._id, name: album.name, imageURL: album.imageURL },
        songs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      "Songs by album retrieved successfully"
    );
  })
);
