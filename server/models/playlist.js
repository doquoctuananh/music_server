const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    imageURL: { type: String },
    songs: [
      {
        songId: { type: String, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Playlist || mongoose.model("Playlist", playlistSchema);
