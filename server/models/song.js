const mongoose = require("mongoose");

const songSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    imageURL: { type: String },
    songUrl: { type: String },
    storagePath: { type: String },
    album: { type: mongoose.Schema.Types.ObjectId, ref: "Album" },
    artist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Artist" }],
    language: { type: String },
    category: { type: [String], default: [] },
    isPublic: { type: Boolean, default: true },
    duration: { type: Number },
    playCount: { type: Number, default: 0 },
    lyrics: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Song || mongoose.model("Song", songSchema);
