/**
 * Songs CRUD Routes
 *
 * PUBLIC: GET /getall, GET /getone/:id, PUT /play/:id
 * ADMIN: POST /add, PUT /:id (with file upload), DELETE /:id, GET /stats, PUT /:id/upload-song, PUT /:id/upload-image
 */
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Song = require("../models/song");
const Artist = require("../models/artist");
const Album = require("../models/album");
const User = require("../models/user");
const ApiResponse = require("../src/utils/apiResponse");
const { asyncHandler, authenticate, requireAdmin, requireMember } = require("../src/middleware");
const supabaseClient = require("../src/utils/supabaseClient");

/**
 * Helper function to delete old file
 */
const deleteOldFile = (filePath) => {
  if (!filePath) return;

  try {
    const fullPath = path.join(__dirname, "../public", filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Deleted old file: ${filePath}`);
    }
  } catch (err) {
    console.error(`❌ Error deleting file: ${err.message}`);
  }
};

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

// Multer for both song files and images
const uploadSongWithImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadDir;
      if (file.fieldname === 'songFile') {
        uploadDir = path.join(__dirname, "../public/mp3");
      } else if (file.fieldname === 'imageFile') {
        uploadDir = path.join(__dirname, "../public/images/songs");
      }
      
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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (file.fieldname === 'songFile') {
      if ([".mp3", ".mp4"].includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Only MP3, MP4 files allowed"), false);
      }
    } else if (file.fieldname === 'imageFile') {
      if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Only JPG, PNG, WebP images allowed"), false);
      }
    } else {
      cb(new Error("Unexpected field"), false);
    }
  }
}).fields([
  { name: 'songFile', maxCount: 1 },
  { name: 'imageFile', maxCount: 1 }
]);

// Multer for only song files
const uploadSongFile = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, "../public/mp3");
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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".mp3", ".mp4"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only MP3, MP4 files allowed"), false);
    }
  }
}).single("songFile");

// Multer for only song images
const uploadSongImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, "../public/images/songs");
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
 * @route   GET /api/songs/getone/:id
 * @desc    Get a single song by ID
 * @access  Public
 */
router.get(
  "/getone/:id",
  asyncHandler(async (req, res) => {
    const song = await Song.findById(req.params.id).lean();

    if (!song) {
      return ApiResponse.notFound(res, "Song not found");
    }

    return ApiResponse.success(res, song, "Song retrieved successfully");
  }),
);

/**
 * @route   GET /api/songs/getall?search=...&artist=...&sort=...&page=1&limit=6
 * @desc    Get all songs with search, filter, sort, and pagination
 * @access  Private (requires token)
 * @query   search, genre, artist, language, album, sort, page (default: 1), limit (default: 6, max: 6)
 */
router.get(
  "/getall",
  authenticate,
  asyncHandler(async (req, res) => {
    const { search, genre, artist, language, album, sort } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 6, 6)); // Default: 6, Max: 6
    const skip = (page - 1) * limit;

    const conditions = [];
    let query = {};

    if (search) {
      conditions.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { artist: { $regex: search, $options: "i" } },
          { album: { $regex: search, $options: "i" } },
          { language: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
        ],
      });
    }

    if (genre) conditions.push({ category: { $regex: genre, $options: "i" } });
    if (artist) conditions.push({ artist: { $regex: artist, $options: "i" } });
    if (language)
      conditions.push({ language: { $regex: language, $options: "i" } });
    if (album) conditions.push({ album: { $regex: album, $options: "i" } });

    if (conditions.length > 0) {
      query.$and = conditions;
    }

    let sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };
    if (sort === "popularity") sortOption = { playCount: -1 };

    const total = await Song.countDocuments(query);
    const songs = await Song.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success(
      res,
      {
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
      "Songs retrieved successfully"
    );
  }),
);

/**
 * @route   GET /api/songs/search?q=keyword&page=1&limit=6
 * @desc    Search songs by name with pagination (6 songs per page)
 * @access  Private (requires authentication - admin or member)
 * @query   q - Search keyword (required)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 6, max: 6)
 */
router.get(
  "/search",
  authenticate,
  asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return ApiResponse.validationError(res, null, "Search keyword is required");
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 6, 6)); // Default: 6, Max: 6
    const skip = (page - 1) * limit;

    // Search by song name (case-insensitive)
    const searchQuery = { name: { $regex: q, $options: "i" } };

    const total = await Song.countDocuments(searchQuery);
    const songs = await Song.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success(
      res,
      {
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
      "Songs searched successfully"
    );
  })
);

/**
 * @route   GET /api/songs/artists-all
 * @desc    Get all artists with id and name (for dropdown select when creating song)
 * @access  Public
 */
router.get(
  "/artists-all",
  asyncHandler(async (req, res) => {
    const artists = await Artist.find({}, { _id: 1, name: 1 }).sort({ name: 1 }).lean();
    const artistList = artists.map(a => ({
      _id: a._id,
      name: a.name
    }));

    return ApiResponse.success(
      res,
      {
        artists: artistList,
        count: artistList.length
      },
      "All artists retrieved successfully"
    );
  })
);

/**
 * @route   GET /api/songs/artists?page=1&limit=10
 * @desc    Get all unique artists with pagination
 * @access  Public
 */
router.get(
  "/artists",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const total = await Song.distinct("artist").then(arr => arr.length);
    const artists = await Song.distinct("artist")
      .sort()
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success(
      res,
      {
        artists,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      "Artists list retrieved successfully"
    );
  })
);

/**
 * @route   GET /api/songs/categories-all
 * @desc    Get all unique categories (no pagination - for dropdown select)
 * @access  Public
 */
router.get(
  "/categories-all",
  asyncHandler(async (req, res) => {
    const categories = await Song.distinct("category")
      .sort()
      .then(arr => arr.filter(c => c));

    return ApiResponse.success(
      res,
      categories,
      "All categories retrieved successfully"
    );
  })
);

/**
 * @route   GET /api/songs/categories?page=1&limit=10
 * @desc    Get all unique categories with pagination (for dropdown select)
 * @access  Public
 */
router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const total = await Song.distinct("category").then(arr => arr.filter(c => c).length);
    const categories = await Song.distinct("category")
      .sort()
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success(
      res,
      {
        categories: categories.filter(c => c),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      "Categories list retrieved successfully"
    );
  })
);

  /**
   * @route   GET /api/songs/by-category?category=...&page=1&limit=6
   * @desc    Get songs filtered by category (member access) with pagination
   * @access  Private (requires token - member or admin)
   */
  router.get(
    "/by-category",
    authenticate,
    asyncHandler(async (req, res) => {
      const { category } = req.query;

      if (!category || category.trim() === "") {
        return ApiResponse.validationError(res, null, "Category is required");
      }

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 6, 6)); // Default: 6, Max: 6
      const skip = (page - 1) * limit;

      const query = { category: { $regex: category, $options: "i" } };

      const total = await Song.countDocuments(query);
      const songs = await Song.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalPages = Math.ceil(total / limit);

      return ApiResponse.success(
        res,
        {
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
        "Songs by category retrieved successfully"
      );
    })
  );

/**
 * @route   GET /api/songs/by-artist?name=...&page=1&limit=6
 * @desc    Get songs filtered by artist name (member access) with pagination
 * @access  Private (requires authentication and member role)
 */
router.get(
  "/by-artist",
  authenticate,
  requireMember,
  asyncHandler(async (req, res) => {
    const { name } = req.query;

    if (!name || name.trim() === "") {
      return ApiResponse.validationError(res, null, "Artist name is required");
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 6, 6)); // Default: 6, Max: 6
    const skip = (page - 1) * limit;

    // Find artists matching the provided name (case-insensitive, partial match)
    const matchingArtists = await Artist.find({ name: { $regex: name, $options: "i" } }, { _id: 1 }).lean();

    if (!matchingArtists || matchingArtists.length === 0) {
      return ApiResponse.success(
        res,
        {
          songs: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: page > 1
          }
        },
        "No songs found for the specified artist"
      );
    }

    const artistIds = matchingArtists.map((a) => a._id);

    const query = { artist: { $in: artistIds } };

    const total = await Song.countDocuments(query);
    const songs = await Song.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success(
      res,
      {
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
      "Songs by artist retrieved successfully"
    );
  })
);

/**
 * @route   GET /api/songs/languages?page=1&limit=10
 * @desc    Get all unique languages with pagination (for dropdown select)
 * @access  Public
 */
router.get(
  "/languages",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const total = await Song.distinct("language").then(arr => arr.filter(l => l).length);
    const languages = await Song.distinct("language")
      .sort()
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success(
      res,
      {
        languages: languages.filter(l => l),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      "Languages list retrieved successfully"
    );
  })
);

/**
 * @route   GET /api/songs/albums?page=1&limit=10
 * @desc    Get all unique albums with pagination (for dropdown select)
 * @access  Public
 */
router.get(
  "/albums",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const total = await Song.distinct("album").then(arr => arr.filter(a => a).length);
    const albums = await Song.distinct("album")
      .sort()
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success(
      res,
      {
        albums: albums.filter(a => a),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      "Albums list retrieved successfully"
    );
  })
);

/**
 * @route   GET /api/songs/stats
 * @desc    Get total songs count (admin only)
 * @access  Private/Admin
 * @headers Authorization: Bearer {admin_token}
 */
router.get(
  "/stats",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const total = await Song.countDocuments();

    return ApiResponse.success(
      res,
      { totalSongs: total },
      "Stats retrieved successfully"
    );
  }),
);

/**
 * @route   PUT /api/songs/play/:id
 * @desc    Increment song play count
 * @access  Public
 */
router.put(
  "/play/:id",
  asyncHandler(async (req, res) => {
    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { $inc: { playCount: 1 } },
      { new: true },
    );

    if (!song) {
      return ApiResponse.notFound(res, "Song not found");
    }

    return ApiResponse.success(res, song, "Play count updated");
  }),
);

/**
 * @route   POST /api/songs/add
 * @desc    Create new song with image and song file (admin only)
 * @access  Private/Admin
 * @body    {
 *   name: String (required) - Tên bài hát
 *   artist: ObjectId (required) - ID của nghệ sĩ (lấy từ /artists-all)
 *   language: String (required) - Ngôn ngữ
 *   category: String (required) - Thể loại
 *   songFile: File (required) - File MP3/MP4 (max 100MB)
 *   imageFile: File (required) - Ảnh JPG/PNG/WebP (max 50MB)
 *   album: String (optional) - ID album (nếu có)
 *   duration: Number (optional) - Độ dài (giây)
 * }
 */
router.post(
  "/add",
  authenticate,
  requireAdmin,
  uploadSongWithImage,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    
    // Clean up: Remove album if it's empty string or null
    if (!body.album || body.album.trim() === "") {
      delete body.album;
    }
    
    const { name, artist, language, category, album, duration } = body;

    // Validate required fields
    const errors = {};
    
    if (!name || name.trim() === "") {
      errors.name = "Tên bài hát là bắt buộc";
    }
    if (!artist || artist.trim() === "") {
      errors.artist = "Tên nghệ sĩ là bắt buộc";
    }
    if (!language || language.trim() === "") {
      errors.language = "Ngôn ngữ là bắt buộc";
    }
    if (!category || category.trim() === "") {
      errors.category = "Thể loại là bắt buộc";
    }

    // Validate file uploads
    let songUrl = "";
    let imageUrl = "";
    let storagePath = null;

    if (!req.files || !req.files.songFile || req.files.songFile.length === 0) {
      errors.songFile = "File audio (MP3/MP4) là bắt buộc";
    } else {
      // Upload the song file to Supabase, then remove local copy
      const songFile = req.files.songFile[0];
      const localPath = path.join(__dirname, "../public/mp3", songFile.filename);
      const destPath = `${Date.now()}_${songFile.filename}`;

      try {
        const result = await supabaseClient.uploadFile(localPath, destPath);
        if (!result || !result.publicUrl) {
          return ApiResponse.error(res, "Failed to upload song to storage", 500);
        }
        songUrl = result.publicUrl;
        storagePath = result.storagePath;
      } catch (err) {
        return ApiResponse.error(res, `Supabase upload error: ${err.message || err}`, 500);
      } finally {
        // Remove local temp file
        try {
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        } catch (e) { /* ignore */ }
      }
    }

    if (!req.files || !req.files.imageFile || req.files.imageFile.length === 0) {
      errors.imageFile = "Ảnh bài hát là bắt buộc";
    } else {
      imageUrl = `/images/songs/${req.files.imageFile[0].filename}`;
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return ApiResponse.validationError(res, errors, "Vui lòng điền tất cả các trường bắt buộc");
    }

    // Validate artist ObjectId
    if (!mongoose.Types.ObjectId.isValid(artist.trim())) {
      return ApiResponse.error(res, "Artist ID không hợp lệ", 400);
    }

    const foundArtist = await Artist.findById(artist.trim());
    if (!foundArtist) {
      return ApiResponse.error(res, "Nghệ sĩ không tồn tại", 404);
    }

    const artistId = foundArtist._id;

    // Find album if provided
    let albumId = null;
    if (album && album.trim() !== "") {
      const albumInput = album.trim();

      if (mongoose.Types.ObjectId.isValid(albumInput)) {
        const foundAlbum = await Album.findById(albumInput);
        if (foundAlbum) {
          albumId = foundAlbum._id;
        }
      }
    }

    const songData = {
      name: name.trim(),
      artist: [artistId],
      language: language.trim(),
      category: category.trim(),
      duration: duration || 0,
      songUrl,
      storagePath,
      imageURL: imageUrl,
      playCount: 0
    };

    // Only add album if it has a valid ObjectId
    if (albumId) {
      songData.album = albumId;
    }

    const song = await Song.create(songData);

    return ApiResponse.created(
      res,
      {
        _id: song._id,
        name: song.name,
        artist: song.artist,
        album: song.album,
        duration: song.duration,
        language: song.language,
        category: song.category,
        songUrl: song.songUrl,
        imageURL: song.imageURL,
        playCount: song.playCount
      },
      "Song created successfully"
    );
  })
);

/**
 * @route   PUT /api/songs/:id
 * @desc    Update song info and/or files (admin only)
 * @access  Private/Admin
 * @body    {
 *   name: String (optional)
 *   artist: ObjectId (optional)
 *   album: ObjectId (optional)
 *   duration: Number (optional)
 *   language: String (optional)
 *   category: String (optional)
 *   songFile: File (optional - MP3/MP4, max 100MB, replaces old song)
 *   imageFile: File (optional - JPG/PNG/WebP, max 50MB, replaces old image)
 * }
 */
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  uploadSongWithImage,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const { name, artist, album, duration, language, category } = body;

    const song = await Song.findById(req.params.id);

    if (!song) {
      return ApiResponse.notFound(res, "Song not found");
    }

    // Update metadata fields
    if (name) song.name = name;
    if (artist) {
      // Validate artist ObjectId
      if (!mongoose.Types.ObjectId.isValid(artist.trim())) {
        return ApiResponse.error(res, "Invalid artist ID", 400);
      }
      const foundArtist = await Artist.findById(artist.trim());
      if (!foundArtist) {
        return ApiResponse.error(res, "Artist not found", 404);
      }
      song.artist = [foundArtist._id];
    }
    if (album !== undefined && album !== null && album !== "") {
      if (mongoose.Types.ObjectId.isValid(album.toString())) {
        const foundAlbum = await Album.findById(album);
        if (foundAlbum) {
          song.album = foundAlbum._id;
        }
      }
    } else if (album === null || album === "") {
      song.album = null;
    }
    if (duration !== undefined) song.duration = duration;
    if (language !== undefined) song.language = language;
    if (category !== undefined) song.category = category;

    // Handle file uploads
    if (req.files) {
      // Update song file if uploaded
      if (req.files.songFile && req.files.songFile.length > 0) {
        const songFile = req.files.songFile[0];
        const localPath = path.join(__dirname, "../public/mp3", songFile.filename);
        const destPath = `${Date.now()}_${songFile.filename}`;

        // Remove old supabase file if exists
        if (song.storagePath) {
          try {
            await supabaseClient.removeFile(song.storagePath);
          } catch (err) {
            console.warn('Failed to remove old supabase file:', err.message || err);
          }
        } else if (song.songUrl) {
          // If previous song was local path, try to remove local file
          deleteOldFile(song.songUrl);
        }

        try {
          const result = await supabaseClient.uploadFile(localPath, destPath);
          song.songUrl = result.publicUrl;
          song.storagePath = result.storagePath;
        } catch (err) {
          return ApiResponse.error(res, `Supabase upload error: ${err.message || err}`, 500);
        } finally {
          try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch (e) { }
        }
      }

      // Update image file if uploaded
      if (req.files.imageFile && req.files.imageFile.length > 0) {
        // Delete old image if exists
        if (song.imageURL) {
          deleteOldImage(song.imageURL);
        }
        song.imageURL = `/images/songs/${req.files.imageFile[0].filename}`;
      }
    }

    await song.save();

    return ApiResponse.success(
      res,
      {
        _id: song._id,
        name: song.name,
        artist: song.artist,
        album: song.album,
        duration: song.duration,
        language: song.language,
        category: song.category,
        songUrl: song.songUrl,
        imageURL: song.imageURL,
        playCount: song.playCount
      },
      "Song updated successfully"
    );
  })
);

/**
 * @route   PUT /api/songs/:id/upload-song
 * @desc    Upload song file (MP3/MP4) (admin only)
 * @access  Private/Admin
 */
router.put(
  "/:id/upload-song",
  authenticate,
  requireAdmin,
  (req, res, next) => {
    uploadSongFile(req, res, (err) => {
      if (err) {
        return ApiResponse.error(res, err.message, 400);
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return ApiResponse.notFound(res, "Song not found");
    }

    if (!req.file) {
      return ApiResponse.error(res, "Song file is required", 400);
    }

    // Delete old supabase file if exists (or local file)
    if (song.storagePath) {
      try {
        await supabaseClient.removeFile(song.storagePath);
      } catch (err) {
        console.warn('Failed to remove old supabase file:', err.message || err);
      }
    } else if (song.songUrl) {
      // previous local file
      deleteOldFile(song.songUrl);
    }

    // Upload new file to Supabase and remove local copy
    const localPath = path.join(__dirname, "../public/mp3", req.file.filename);
    const destPath = `${Date.now()}_${req.file.filename}`;
    try {
      const result = await supabaseClient.uploadFile(localPath, destPath);
      if (!result || !result.publicUrl) {
        return ApiResponse.error(res, "Failed to upload song to storage", 500);
      }
      song.songUrl = result.publicUrl;
      song.storagePath = result.storagePath;
    } catch (err) {
      return ApiResponse.error(res, `Supabase upload error: ${err.message || err}`, 500);
    } finally {
      try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch (e) { }
    }

    await song.save();

    return ApiResponse.success(
      res,
      {
        _id: song._id,
        name: song.name,
        artist: song.artist,
        songUrl: song.songUrl,
        imageURL: song.imageURL
      },
      "Song file uploaded successfully"
    );
  })
);

/**
 * @route   PUT /api/songs/:id/upload-image
 * @desc    Upload song image (admin only)
 * @access  Private/Admin
 */
router.put(
  "/:id/upload-image",
  authenticate,
  requireAdmin,
  (req, res, next) => {
    uploadSongImage(req, res, (err) => {
      if (err) {
        return ApiResponse.error(res, err.message, 400);
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return ApiResponse.notFound(res, "Song not found");
    }

    if (!req.file) {
      return ApiResponse.error(res, "Image file is required", 400);
    }

    // Delete old image file if exists
    if (song.imageURL) {
      deleteOldFile(song.imageURL);
    }

    song.imageURL = `/images/songs/${req.file.filename}`;
    await song.save();

    return ApiResponse.success(
      res,
      {
        _id: song._id,
        name: song.name,
        artist: song.artist,
        songUrl: song.songUrl,
        imageURL: song.imageURL
      },
      "Song image uploaded successfully"
    );
  })
);

/**
 * @route   DELETE /api/songs/:id
 * @desc    Delete song and its files (admin only)
 * @access  Private/Admin
 */
/**
 * @route   DELETE /api/songs/:id
 * @desc    Delete song and remove from all users' favorites (admin only)
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const songId = req.params.id;
    const song = await Song.findById(songId);

    if (!song) {
      return ApiResponse.notFound(res, "Song not found");
    }

    // Delete song file if exists (Supabase or local)
    if (song.storagePath) {
      try {
        await supabaseClient.removeFile(song.storagePath);
      } catch (err) {
        console.warn('Failed to remove supabase file:', err.message || err);
      }
    } else if (song.songUrl) {
      deleteOldFile(song.songUrl);
    }

    // Delete image file if exists (local images only)
    if (song.imageURL) {
      deleteOldImage(song.imageURL);
    }

    // Remove song from all users' favorites
    await User.updateMany(
      { favourites: songId },
      { $pull: { favourites: songId } }
    );

    // Delete song from database
    await Song.findByIdAndDelete(songId);

    return ApiResponse.success(
      res,
      { _id: songId },
      "Song deleted successfully. Removed from all users' favorites"
    );
  })
);

module.exports = router;
