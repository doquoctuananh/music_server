/**
 * Songs Upload Route
 *
 * Handles file upload (MP3 + image) and creates song record
 * POST /api/songs/upload - Upload new song (admin only)
 */
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Album = require("../models/album");
const Artist = require("../models/artist");
const ApiResponse = require("../src/utils/apiResponse");
const { asyncHandler, authenticate, requireAdmin } = require("../src/middleware");
const supabaseClient = require("../src/utils/supabaseClient");
const Song = require("../models/song");

// ── Multer Storage Configuration ──────────────────────────────────────
// Combine both storage for fields (MP3 + Image)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === "songFile") {
        const uploadDir = path.join(__dirname, "../public/mp3");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      } else if (file.fieldname === "imageFile") {
        const uploadDir = path.join(__dirname, "../public/images/songs");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const name = file.originalname
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .toLowerCase();
      cb(null, `${Date.now()}_${name}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "songFile") {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === ".mp3") {
        cb(null, true);
      } else {
        cb(new Error("Only MP3 files allowed for audio"), false);
      }
    } else if (file.fieldname === "imageFile") {
      const ext = path.extname(file.originalname).toLowerCase();
      if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Only JPG, PNG, WebP images allowed"), false);
      }
    } else {
      cb(null, true);
    }
  }
}).fields([
  { name: "songFile", maxCount: 1 },
  { name: "imageFile", maxCount: 1 }
]);

/**
 * @route   POST /api/songs/upload
 * @desc    Upload new song with metadata (admin only)
 * @access  Admin
 * @body    {
 *   songFile: File (required, .mp3)
 *   imageFile: File (required, image)
 *   name: String (required)
 *   artist: String[] (required, comma-separated or JSON array)
 *   album: String (required)
 *   language: String (required)
 *   category: String[] (comma-separated or JSON array)
 *   duration: Number (optional, in seconds)
 *   lyrics: String (optional)
 * }
 */
router.post(
  "/upload",
  authenticate,
  requireAdmin,
  upload,
  asyncHandler(async (req, res) => {
    // Validate files
    if (!req.files?.songFile || !req.files?.imageFile) {
      return ApiResponse.error(res, "Both songFile and imageFile are required", 400);
    }

    const songFile = req.files.songFile[0];
    const imageFile = req.files.imageFile[0];

    // Validate metadata
    const { name, artist, language, category, album, duration, lyrics } = req.body;

    if (!name || !artist || !language || !category) {
      return ApiResponse.error(
        res,
        "Missing required fields: name, artist (ID/IDs), language, category. Album is optional",
        400
      );
    }

    try {
      // Validate artist(s) exist
      let artistArray = Array.isArray(artist) ? artist : [artist];
      for (let artistId of artistArray) {
        const artistDoc = await Artist.findById(artistId);
        if (!artistDoc) {
          return ApiResponse.error(res, `Artist not found: ${artistId}`, 400);
        }
      }

      // Validate album if provided
      let albumId = null;
      if (album) {
        const albumDoc = await Album.findById(album);
        if (!albumDoc) {
          return ApiResponse.error(res, `Album not found: ${album}`, 400);
        }
        albumId = album;
      }

      // Parse category
      let categoryArray = Array.isArray(category)
        ? category
        : typeof category === "string"
          ? category.split(",").map((c) => c.trim())
          : [category];

      // Upload audio to Supabase
      const localPath = path.join(__dirname, "../public/mp3", songFile.filename);
      const destPath = `${Date.now()}_${songFile.filename}`;
      let uploaded = null;
      try {
        uploaded = await supabaseClient.uploadFile(localPath, destPath);
      } catch (err) {
        // Clean up local files and return error
        if (songFile?.path) fs.unlink(songFile.path, () => {});
        if (imageFile?.path) fs.unlink(imageFile.path, () => {});
        return ApiResponse.error(res, `Supabase upload error: ${err.message || err}`, 500);
      } finally {
        try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch (e) {}
      }

      // Create song record with Supabase URL
      const song = await Song.create({
        name,
        artist: artistArray,
        album: albumId,
        language,
        category: categoryArray,
        imageURL: `/images/songs/${imageFile.filename}`,
        songUrl: uploaded.publicUrl,
        storagePath: uploaded.storagePath,
        duration: duration ? parseInt(duration) : 0,
        lyrics: lyrics || "",
        isPublic: true,
        playCount: 0
      });

      return ApiResponse.created(
        res,
        {
          _id: song._id,
          name: song.name,
          artist: song.artist,
          album: song.album,
          imageURL: song.imageURL,
          songUrl: song.songUrl,
          duration: song.duration
        },
        "Song uploaded successfully"
      );
    } catch (err) {
      // Clean up uploaded files on error
      if (songFile?.path) {
        fs.unlink(songFile.path, () => {});
      }
      if (imageFile?.path) {
        fs.unlink(imageFile.path, () => {});
      }
      throw err;
    }
  })
);

/**
 * @route   DELETE /api/songs/:id
 * @desc    Delete song by ID (admin only)
 * @access  Admin
 */
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return ApiResponse.notFound(res, "Song not found");
    }

    // Delete files from storage/disk
    if (song.storagePath) {
      try { await supabaseClient.removeFile(song.storagePath); } catch (err) { console.warn(err); }
    } else if (song.songUrl) {
      const songPath = path.join(__dirname, "../public", song.songUrl);
      fs.unlink(songPath, () => {});
    }

    if (song.imageURL) {
      const imagePath = path.join(__dirname, "../public", song.imageURL);
      fs.unlink(imagePath, () => {}); // Non-blocking delete
    }

    // Delete from DB
    await Song.findByIdAndDelete(req.params.id);

    return ApiResponse.success(res, { _id: req.params.id }, "Song deleted successfully");
  })
);

/**
 * @route   PUT /api/songs/:id
 * @desc    Update song metadata (admin only)
 * @access  Admin
 * @body    {
 *   name: String (optional)
 *   artist: String[] (optional)
 *   album: String (optional)
 *   language: String (optional)
 *   category: String[] (optional)
 *   duration: Number (optional)
 *   lyrics: String (optional)
 *   imageFile: File (optional, replace image)
 *   songFile: File (optional, replace audio)
 * }
 */
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  upload,
  asyncHandler(async (req, res) => {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return ApiResponse.notFound(res, "Song not found");
    }

    const { name, artist, album, language, category, duration, lyrics } = req.body;

    // Update metadata
    if (name) song.name = name;
    
    if (artist) {
      let artistArray = Array.isArray(artist) ? artist : [artist];
      // Validate all artist IDs exist
      for (let artistId of artistArray) {
        const artistDoc = await Artist.findById(artistId);
        if (!artistDoc) {
          return ApiResponse.error(res, `Artist not found: ${artistId}`, 400);
        }
      }
      song.artist = artistArray;
    }
    
    if (album) {
      const albumDoc = await Album.findById(album);
      if (!albumDoc) {
        return ApiResponse.error(res, `Album not found: ${album}`, 400);
      }
      song.album = album;
    }
    
    if (language) song.language = language;
    
    if (category) {
      song.category = Array.isArray(category)
        ? category
        : typeof category === "string"
          ? category.split(",").map((c) => c.trim())
          : song.category;
    }
    
    if (duration) song.duration = parseInt(duration);
    if (lyrics) song.lyrics = lyrics;

    // Update image if new file uploaded
    if (req.files?.imageFile) {
      const imageFile = req.files.imageFile[0];
      // Delete old image
      if (song.imageURL) {
        const oldImagePath = path.join(__dirname, "../public", song.imageURL);
        fs.unlink(oldImagePath, () => {});
      }
      song.imageURL = `/images/songs/${imageFile.filename}`;
    }

    // Update audio if new file uploaded
    if (req.files?.songFile) {
      const songFile = req.files.songFile[0];
      const localPath = path.join(__dirname, "../public/mp3", songFile.filename);
      const destPath = `${Date.now()}_${songFile.filename}`;

      // Remove old supabase file if exists
      if (song.storagePath) {
        try { await supabaseClient.removeFile(song.storagePath); } catch (err) { console.warn(err); }
      } else if (song.songUrl) {
        const oldSongPath = path.join(__dirname, "../public", song.songUrl);
        fs.unlink(oldSongPath, () => {});
      }

      try {
        const uploaded = await supabaseClient.uploadFile(localPath, destPath);
        song.songUrl = uploaded.publicUrl;
        song.storagePath = uploaded.storagePath;
      } catch (err) {
        return ApiResponse.error(res, `Supabase upload error: ${err.message || err}`, 500);
      } finally {
        try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch (e) {}
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
        imageURL: song.imageURL,
        songUrl: song.songUrl,
        duration: song.duration
      },
      "Song updated successfully"
    );
  })
);

module.exports = router;
