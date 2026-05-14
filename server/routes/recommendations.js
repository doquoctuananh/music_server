/**
 * AI Music Recommendation Routes
 *
 * Uses Hugging Face API to generate personalized song recommendations
 * based on user listening history and favourites.
 *
 * GET /api/recommendations — Get AI-powered song recommendations
 */
const router = require("express").Router();
const Song = require("../models/song");
const User = require("../models/user");
const History = require("../models/listeningHistory");
const ApiResponse = require("../src/utils/apiResponse");
const { authenticate, asyncHandler } = require("../src/middleware");

const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.3";

async function askHuggingFace(prompt) {
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${HF_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          return_full_text: false,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HuggingFace API error: ${res.status} - ${errText}`);
  }

  return res.json();
}

/**
 * @route   GET /api/recommendations
 * @desc    Get AI-powered song recommendations for authenticated user
 * @access  Private
 */
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Gather user data
    const [user, history, allSongs] = await Promise.all([
      User.findById(userId).lean(),
      History.find({ user: userId.toString() }).sort({ playedAt: -1 }).limit(20).lean(),
      Song.find({}).lean(),
    ]);

    if (!allSongs.length) {
      return ApiResponse.success(res, [], "No songs available");
    }

    // Get listened song details
    const historyIds = history.map((h) => h.song.toString());
    const favouriteIds = user?.favourites || [];

    const listenedSongs = allSongs.filter((s) =>
      historyIds.includes(s._id.toString())
    );
    const favouriteSongs = allSongs.filter((s) =>
      favouriteIds.includes(s._id.toString())
    );

    // Analyze user preferences
    const genreCounts = {};
    const artistCounts = {};
    [...listenedSongs, ...favouriteSongs].forEach((s) => {
      (s.category || []).forEach((c) => {
        genreCounts[c] = (genreCounts[c] || 0) + 1;
      });
      (s.artist || []).forEach((a) => {
        artistCounts[a] = (artistCounts[a] || 0) + 1;
      });
    });

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g);
    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([a]) => a);

    // Build catalog summary for AI
    const catalogSummary = allSongs
      .slice(0, 50)
      .map((s) => `"${s.name}" - ${(s.artist || []).join(", ")} [${(s.category || []).join(", ")}]`)
      .join("\n");

    const prompt = `<s>[INST] Bạn là hệ thống gợi ý nhạc Việt Nam. Dựa trên hành vi người dùng, hãy chọn 10 bài hát phù hợp nhất từ danh sách bên dưới.

Thể loại yêu thích: ${topGenres.join(", ") || "Chưa xác định"}
Nghệ sĩ yêu thích: ${topArtists.join(", ") || "Chưa xác định"}
Bài đã nghe gần đây: ${listenedSongs.slice(0, 5).map((s) => s.name).join(", ") || "Chưa có"}

Danh sách nhạc:
${catalogSummary}

Trả lời CHÍNH XÁC tên 10 bài hát từ danh sách trên, mỗi bài trên một dòng, KHÔNG giải thích, KHÔNG đánh số. Chỉ tên bài hát. [/INST]`;

    let recommendedSongs = [];

    try {
      const hfResponse = await askHuggingFace(prompt);
      const aiText = hfResponse?.[0]?.generated_text || "";

      // Parse AI response — each line is a song name
      const suggestedNames = aiText
        .split("\n")
        .map((l) => l.replace(/^\d+[\.\)]\s*/, "").replace(/^[-•]\s*/, "").replace(/"/g, "").trim())
        .filter((l) => l.length > 2);

      // Match with actual songs in DB
      recommendedSongs = suggestedNames
        .map((name) =>
          allSongs.find(
            (s) => s.name.toLowerCase() === name.toLowerCase()
          )
        )
        .filter(Boolean);
    } catch (aiError) {
      console.error("AI recommendation error:", aiError.message);
    }

    // Fallback: if AI returns too few, add genre-based picks
    if (recommendedSongs.length < 8) {
      const alreadyIds = new Set([
        ...historyIds,
        ...recommendedSongs.map((s) => s._id.toString()),
      ]);

      const genrePicks = allSongs
        .filter(
          (s) =>
            !alreadyIds.has(s._id.toString()) &&
            (s.category || []).some((c) => topGenres.includes(c))
        )
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 10 - recommendedSongs.length);

      recommendedSongs = [...recommendedSongs, ...genrePicks];
    }

    // Final fallback: popular songs
    if (recommendedSongs.length < 5) {
      const alreadyIds = new Set(recommendedSongs.map((s) => s._id.toString()));
      const popular = allSongs
        .filter((s) => !alreadyIds.has(s._id.toString()))
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 10 - recommendedSongs.length);
      recommendedSongs = [...recommendedSongs, ...popular];
    }

    return ApiResponse.success(
      res,
      {
        songs: recommendedSongs.slice(0, 10),
        preferences: { topGenres, topArtists },
        source: recommendedSongs.length > 0 ? "ai" : "fallback",
      },
      "Recommendations generated"
    );
  })
);

module.exports = router;
