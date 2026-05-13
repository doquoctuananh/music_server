/**
 * Artists Management Routes (CRUD)
 *
 * PUBLIC: GET /getall, GET /getone/:id
 * ADMIN: POST /add, PUT /:id, DELETE /:id, PUT /:id/upload
 */
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Artist = require("../models/artist");
const Song = require("../models/song");
const Album = require("../models/album");
const User = require("../models/user");
const ListeningHistory = require("../models/listeningHistory");
const ApiResponse = require("../src/utils/apiResponse");
const { asyncHandler, authenticate, requireAdmin } = require("../src/middleware");

/**
 * Helper function to delete old image file
 */
const deleteOldImage = (imageURL) => {
  if (!imageURL) return;

  try {
    const filePath = path.join(__dirname, "../public", imageURL);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted old image: ${imageURL}`);
    }
  } catch (err) {
    console.error(`❌ Error deleting image: ${err.message}`);
  }
};

// Multer storage for artist images
const uploadArtistImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, "../public/images/artists");
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
 * @route   GET /api/artists/getall?page=1&limit=5
 * @desc    Get all artists with pagination
 * @access  Private (requires Authentication)
 * @headers Authorization: Bearer {token}
 * @query   {
 *   page: Number (default: 1)
 *   limit: Number (default: 5, max: 5)
 * }
 * @response {
 *   data: [artists array (max 5)],
 *   pagination: {
 *     page: Number,
 *     limit: Number,
 *     total: Number,
 *     totalPages: Number,
 *     hasNextPage: Boolean,
 *     hasPrevPage: Boolean
 *   }
 * }
 */
router.get(
  "/getall",
  authenticate,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 5, 5)); // Default: 5, Max: 5
    const skip = (page - 1) * limit;

    const total = await Artist.countDocuments();
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const artists = await Artist.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return ApiResponse.success(
      res,
      {
        data: artists,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      },
      "Artists retrieved successfully"
    );
  })
);

/**
 * @route   GET /api/artists/getone/:id
 * @desc    Get single artist by ID
 * @access  Public
 */
router.get(
  "/getone/:id",
  asyncHandler(async (req, res) => {
    const artist = await Artist.findById(req.params.id).lean();

    if (!artist) {
      return ApiResponse.notFound(res, "Artist not found");
    }

    return ApiResponse.success(res, artist, "Artist retrieved successfully");
  })
);

/**
 * @route   GET /api/artists/stats
 * @desc    Get artist statistics (total count)
 * @access  Public
 */
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const total = await Artist.countDocuments();

    return ApiResponse.success(
      res,
      {
        total,
        message: `Total ${total} artist(s)`
      },
      "Artist statistics retrieved successfully"
    );
  })
);

/**
 * @route   POST /api/artists/add
 * @desc    Create new artist with optional image (admin only)
 * @access  Private/Admin
 * @body    {
 *   name: String (required)
 *   twitter: String (optional)
 *   instagram: String (optional)
 *   imageFile: File (optional, image)
 * }
 */
router.post(
  "/add",
  authenticate,
  requireAdmin,
  uploadArtistImage,
  asyncHandler(async (req, res) => {
    const { name, twitter, instagram } = req.body;

    if (!name) {
      return ApiResponse.validationError(res, null, "Artist name is required");
    }

    // Set imageURL if file uploaded, otherwise empty
    let imageURL = "";
    if (req.file) {
      imageURL = `/images/artists/${req.file.filename}`;
    }

    const artist = await Artist.create({
      name,
      imageURL,
      twitter: twitter || "",
      instagram: instagram || ""
    });

    return ApiResponse.created(
      res,
      {
        _id: artist._id,
        name: artist.name,
        imageURL: artist.imageURL,
        twitter: artist.twitter,
        instagram: artist.instagram
      },
      "Artist created successfully"
    );
  })
);

/**
 * @route   PUT /api/artists/:id
 * @desc    Update artist info (admin only) - delete old image if imageURL changes or new image uploaded
 * @access  Private/Admin
 * @body    {
 *   name: String (optional)
 *   twitter: String (optional)
 *   instagram: String (optional)
 *   imageURL: String (optional - for updating image URL directly)
 *   imageFile: File (optional - to upload new image, max 50MB)
 * }
 */
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  uploadArtistImage,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const { name, imageURL, twitter, instagram } = body;

    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      return ApiResponse.notFound(res, "Artist not found");
    }

    if (name) artist.name = name;
    
    // If new image file is uploaded
    if (req.file) {
      // Delete old image if exists
      if (artist.imageURL) {
        deleteOldImage(artist.imageURL);
      }
      artist.imageURL = `/images/artists/${req.file.filename}`;
    } 
    // If imageURL is changed in body, delete old image
    else if (imageURL !== undefined && imageURL !== artist.imageURL) {
      if (artist.imageURL) {
        deleteOldImage(artist.imageURL);
      }
      artist.imageURL = imageURL;
    }
    
    if (twitter !== undefined) artist.twitter = twitter;
    if (instagram !== undefined) artist.instagram = instagram;

    await artist.save();

    return ApiResponse.success(
      res,
      {
        _id: artist._id,
        name: artist.name,
        imageURL: artist.imageURL,
        twitter: artist.twitter,
        instagram: artist.instagram
      },
      "Artist updated successfully"
    );
  })
);

/**
 * @route   GET /api/artists/search?q=keyword&page=1&limit=5
 * @desc    Search artists by name
 * @access  Private (requires Authentication)
 * @headers Authorization: Bearer {token}
 * @query   q - Search keyword (required)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 5, max: 5)
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
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 5, 5)); // Default: 5, Max: 5
    const skip = (page - 1) * limit;

    // Search using regex for case-insensitive search
    const searchQuery = { name: { $regex: q, $options: "i" } };

    const total = await Artist.countDocuments(searchQuery);
    const artists = await Artist.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success(
      res,
      {
        data: artists,
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

/**
 * @route   DELETE /api/artists/:id
 * @desc    Delete artist and cascade delete: songs, albums, listening history, and favorites (admin only)
 * @access  Private/Admin
 * @cascade:
 *   1. Delete all songs by this artist (and their files)
 *   2. Delete listening history for those songs
 *   3. Delete all albums by this artist
 *   4. Remove those songs from user favorites
 */
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const artistId = req.params.id;
    const artist = await Artist.findById(artistId);

    if (!artist) {
      return ApiResponse.notFound(res, "Artist not found");
    }

    // 1. Delete artist image
    if (artist.imageURL) {
      deleteOldImage(artist.imageURL);
    }

    // 2. Find all songs by this artist
    const artistSongs = await Song.find({ artist: artistId });
    const songIds = artistSongs.map(s => s._id);

    // 3. Delete song files
    for (const song of artistSongs) {
      // Delete song MP3/MP4 file
      if (song.songUrl) {
        const songPath = path.join(__dirname, "../public", song.songUrl);
        try {
          if (fs.existsSync(songPath)) {
            fs.unlinkSync(songPath);
            console.log(`✅ Deleted song file: ${song.songUrl}`);
          }
        } catch (err) {
          console.error(`❌ Error deleting song file: ${err.message}`);
        }
      }
      
      // Delete song image
      if (song.imageURL) {
        const imagePath = path.join(__dirname, "../public", song.imageURL);
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log(`✅ Deleted song image: ${song.imageURL}`);
          }
        } catch (err) {
          console.error(`❌ Error deleting song image: ${err.message}`);
        }
      }
    }

    // 4. Delete listening history for these songs
    const historyDeleted = await ListeningHistory.deleteMany({
      song: { $in: songIds }
    });
    console.log(`✅ Deleted ${historyDeleted.deletedCount} listening history entries`);

    // 5. Remove songs from user favorites
    const usersUpdated = await User.updateMany(
      { favourites: { $in: songIds } },
      { $pull: { favourites: { $in: songIds } } }
    );
    console.log(`✅ Updated ${usersUpdated.modifiedCount} user(s) - removed songs from favorites`);

    // 6. Delete all songs by this artist
    await Song.deleteMany({ artist: artistId });

    // 7. Delete all albums by this artist
    const albumsDeleted = await Album.deleteMany({ artist: artistId });
    console.log(`✅ Deleted ${albumsDeleted.deletedCount} album(s)`);

    // 8. Delete the artist
    await Artist.findByIdAndDelete(artistId);

    return ApiResponse.success(
      res,
      {
        _id: artistId,
        songsDeleted: songIds.length,
        albumsDeleted: albumsDeleted.deletedCount,
        historyDeleted: historyDeleted.deletedCount,
        usersUpdated: usersUpdated.modifiedCount
      },
      `Artist and all related data deleted successfully. Deleted ${songIds.length} song(s), ${albumsDeleted.deletedCount} album(s), ${historyDeleted.deletedCount} history entry(ies)`
    );
  })
);

/**
 * @route   PUT /api/artists/:id/upload
 * @desc    Upload artist image (admin only)
 * @access  Private/Admin
 */
router.put(
  "/:id/upload",
  authenticate,
  requireAdmin,
  uploadArtistImage,
  asyncHandler(async (req, res) => {
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      return ApiResponse.notFound(res, "Artist not found");
    }

    if (!req.file) {
      return ApiResponse.error(res, "Image file is required", 400);
    }

    // Delete old image if exists
    if (artist.imageURL) {
      deleteOldImage(artist.imageURL);
    }

    artist.imageURL = `/images/artists/${req.file.filename}`;
    await artist.save();

    return ApiResponse.success(
      res,
      {
        _id: artist._id,
        name: artist.name,
        imageURL: artist.imageURL,
        twitter: artist.twitter,
        instagram: artist.instagram
      },
      "Artist image uploaded successfully"
    );
  })
);

module.exports = router;
