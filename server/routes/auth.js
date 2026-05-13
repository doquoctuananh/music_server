/**
 * User Authentication Routes
 *
 * PUBLIC: GET /login (with token)
 * AUTHENTICATED: PUT /updateuser/:userId, PUT /updateFavourites/:userId
 * ADMIN ONLY: GET /getusers, PUT /updaterole/:userId, DELETE /deleteuser/:userId
 */
const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const ApiResponse = require("../src/utils/apiResponse");
const {
  authenticate,
  requireAdmin,
  asyncHandler,
  optionalImageUpload,
} = require("../src/middleware");

const jwt = require("jsonwebtoken");

/**
 * Helper function to delete old image file
 */
const deleteOldImage = (imageURL) => {
  if (!imageURL || imageURL.startsWith("http")) {
    // Don't delete external URLs
    return;
  }

  try {
    // Extract filename from path like "/images/users/filename.jpg"
    if (imageURL.includes("/images/users/")) {
      const uploadDir = path.join(__dirname, "../public/images/users");
      const filename = path.basename(imageURL);
      const filePath = path.join(uploadDir, filename);

      // Check if file exists and delete it
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted old image: ${filename}`);
      }
    }
  } catch (err) {
    console.error(`❌ Error deleting old image: ${err.message}`);
    // Don't throw error, just log it
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "spotify_secret_123", {
    expiresIn: "30d",
  });
};

/**
 * @route   POST /api/users/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return ApiResponse.error(res, "User already exists", 400);
    }

    const user = await User.create({
      name,
      email,
      password,
      imageURL: "",
    });

    if (user) {
      return ApiResponse.created(
        res,
        {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            imageURL: user.imageURL,
            role: user.role,
          },
          token: generateToken(user._id),
        },
        "User registered successfully"
      );
    } else {
      return ApiResponse.error(res, "Invalid user data", 400);
    }
  })
);

/**
 * @route   POST /api/users/login
 * @desc    Login user with email/password
 * @access  Public
 */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      return ApiResponse.success(
        res,
        {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            imageURL: user.imageURL,
            role: user.role,
          },
          token: generateToken(user._id),
        },
        "Login successful"
      );
    } else {
      return ApiResponse.unauthorized(res, "Invalid email or password");
    }
  })
);

/**
 * @route   POST /api/users/signup-admin
 * @desc    Register admin user (only if no admin exists, or with admin token)
 * @access  Public (first admin), Private/Admin (additional admins)
 */
router.post(
  "/signup-admin",
  asyncHandler(async (req, res) => {
    const { name, email, password, adminSecret } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return ApiResponse.error(res, "User already exists", 400);
    }

    // Check if admin already exists
    const adminExists = await User.findOne({ role: "admin" });
    
    // Allow if:
    // 1. No admin exists (first admin signup), OR
    // 2. Has valid admin secret key from env, OR
    // 3. Request has valid admin token
    const hasAdminToken = req.headers.authorization?.startsWith("Bearer ");
    const validSecret = adminSecret === process.env.ADMIN_SECRET_KEY;

    if (adminExists && !validSecret && !hasAdminToken) {
      return ApiResponse.unauthorized(
        res,
        "Admin already exists. Only admin can create new admins.",
        403
      );
    }

    try {
      const user = await User.create({
        name,
        email,
        password,
        role: "admin",
        imageURL: "",
      });

      if (user) {
        return ApiResponse.created(
          res,
          {
            user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              imageURL: user.imageURL,
              role: user.role,
            },
            token: generateToken(user._id),
          },
          "Admin registered successfully"
        );
      }
    } catch (err) {
      return ApiResponse.error(res, err.message, 400);
    }
  })
);

/**
 * @route   POST /api/users/create-user
 * @desc    Admin creates user with custom role and optional image upload
 * @access  Private/Admin
 * @body    name, email, password, role (optional), image (optional, form-data)
 */
router.post(
  "/create-user",
  authenticate,
  requireAdmin,
  optionalImageUpload,
  asyncHandler(async (req, res) => {
    const { name, email, password, role, imageURL } = req.body;

    // Validation
    if (!name || !email || !password) {
      return ApiResponse.validationError(
        res,
        null,
        "Missing required fields: name, email, password"
      );
    }

    if (role && !["member", "admin"].includes(role)) {
      return ApiResponse.validationError(res, null, "Invalid role");
    }

    // Check email uniqueness
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return ApiResponse.error(
        res,
        "Email already exists. Please use a different email.",
        409,
        { field: "email", errorCode: "EMAIL_DUPLICATE" }
      );
    }

    // Determine image URL
    let finalImageURL = imageURL || "";
    
    // If file uploaded, set path
    if (req.file) {
      finalImageURL = `/images/users/${req.file.filename}`;
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "member",
      imageURL: finalImageURL,
    });

    return ApiResponse.created(
      res,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          imageURL: user.imageURL,
          role: user.role,
        },
        token: generateToken(user._id),
      },
      "User created successfully"
    );
  })
);

/**
 * @route   GET /api/users/getusers?page=1&limit=6
 * @desc    Get all users with pagination (Admin only)
 * @access  Private/Admin
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 6, max: 6)
 */
router.get(
  "/getusers",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 6, 6)); // Default: 6, Max: 6
    const skip = (page - 1) * limit;

    const total = await User.countDocuments();
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    return ApiResponse.success(
      res,
      {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Users retrieved successfully"
    );
  }),
);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user details by ID
 * @access  Private (owner or admin)
 */
router.get(
  "/:userId",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.userId).select("-password");

    if (!user) {
      return ApiResponse.notFound(res, "User not found");
    }

    // Authorization: User can view their own profile or admin can view any
    const isOwner = user._id.toString() === req.user._id.toString();
    const isAdmin = req.user?.role === "admin";

    if (!isOwner && !isAdmin) {
      return ApiResponse.forbidden(
        res,
        "You can only view your own profile"
      );
    }

    return ApiResponse.success(
      res,
      { user },
      "User retrieved successfully"
    );
  })
);

/**
 * @route   PUT /api/users/updaterole/:userId
 * @desc    Update a user's role (Admin only)
 * @access  Private/Admin
 */
router.put(
  "/updaterole/:userId",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { role } = req.body.data || req.body;

    if (!role || !["member", "admin"].includes(role)) {
      return ApiResponse.validationError(
        res,
        null,
        "Invalid role. Must be 'member' or 'admin'",
      );
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true },
    );

    if (!user) {
      return ApiResponse.notFound(res, "User not found");
    }

    return ApiResponse.success(res, { user }, "User role updated successfully");
  }),
);

/**
 * @route   DELETE /api/users/deleteuser/:userId
 * @desc    Delete a user (Admin only) - also deletes user's image
 * @access  Private/Admin
 */
router.delete(
  "/deleteuser/:userId",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    // Prevent self-deletion
    if (req.user._id.toString() === req.params.userId) {
      return ApiResponse.error(res, "Cannot delete your own account", 400);
    }

    // Get user first to delete their image
    const user = await User.findById(req.params.userId);

    if (!user) {
      return ApiResponse.notFound(res, "User not found");
    }

    // Delete user's image if exists
    if (user.imageURL) {
      deleteOldImage(user.imageURL);
    }

    // Delete user from database
    await User.findByIdAndDelete(req.params.userId);

    return ApiResponse.success(
      res,
      null,
      "User and their image deleted successfully"
    );
  }),
);

/**
 * @route   PUT /api/users/updateuser/:userId
 * @desc    Update user profile (owner or admin) - name, email, image
 * @access  Private
 * @body    name, email (both optional), image (file upload, optional)
 */
router.put(
  "/updateuser/:userId",
  authenticate,
  optionalImageUpload,
  asyncHandler(async (req, res) => {
    // Check if user exists
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return ApiResponse.notFound(res, "User not found");
    }

    // Authorization check
    const isOwner = targetUser._id.toString() === req.user._id.toString();
    const isAdmin = req.user?.role === "admin";

    if (!isOwner && !isAdmin) {
      return ApiResponse.forbidden(
        res,
        "You can only update your own profile"
      );
    }

    const { name, email, imageURL } = req.body || {};
    const updateData = {};

    // Validate and set name
    if (name) {
      updateData.name = name.trim();
    }

    // Validate and set email with duplicate check
    if (email) {
      const emailTrim = email.toLowerCase().trim();
      
      // Check if email already exists (excluding current user)
      const emailExists = await User.findOne({
        email: emailTrim,
        _id: { $ne: req.params.userId }, // Exclude current user
      });

      if (emailExists) {
        return ApiResponse.error(
          res,
          "Email already exists. Please use a different email.",
          409,
          { field: "email", errorCode: "EMAIL_DUPLICATE" }
        );
      }

      updateData.email = emailTrim;
    }

    // Handle image - prioritize uploaded file, then body imageURL
    if (req.file) {
      // Delete old image if exists
      if (targetUser.imageURL) {
        deleteOldImage(targetUser.imageURL);
      }
      updateData.imageURL = `/images/users/${req.file.filename}`;
    } else if (imageURL) {
      updateData.imageURL = imageURL;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    return ApiResponse.success(
      res,
      { user: updatedUser },
      "Profile updated successfully"
    );
  })
);

/**
 * @route   PUT /api/users/updateFavourites/:userId
 * @desc    Toggle a song in user's favourites
 * @access  Private
 */
router.put(
  "/updateFavourites/:userId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { songId } = req.body;

    if (!songId) {
      return ApiResponse.validationError(res, null, "Song ID is required");
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return ApiResponse.notFound(res, "User not found");
    }

    // Check if user is updating own favourites (compare MongoDB _id)
    if (user._id.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(
        res,
        "You can only update your own favourites",
      );
    }

    const favourites = user.favourites || [];
    const isPresent = favourites.includes(songId);

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      isPresent
        ? { $pull: { favourites: songId } }
        : { $addToSet: { favourites: songId } },
      { new: true },
    );

    const action = isPresent ? "removed from" : "added to";
    return ApiResponse.success(
      res,
      { user: updatedUser },
      `Song ${action} favourites`,
    );
  }),
);

/**
 * @route   PUT /api/users/changepassword/:userId
 * @desc    Change user password
 * @access  Private
 */
router.put(
  "/changepassword/:userId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return ApiResponse.validationError(
        res,
        null,
        "Current and new password are required"
      );
    }

    if (newPassword.length < 6) {
      return ApiResponse.validationError(
        res,
        null,
        "New password must be at least 6 characters"
      );
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return ApiResponse.notFound(res, "User not found");
    }

    // Verify ownership
    if (user._id.toString() !== req.user._id.toString()) {
      return ApiResponse.forbidden(res, "You can only change your own password");
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return ApiResponse.unauthorized(res, "Current password is incorrect");
    }

    user.password = newPassword;
    await user.save(); // triggers bcrypt pre-save hook

    return ApiResponse.success(res, null, "Password changed successfully");
  })
);

module.exports = router;
