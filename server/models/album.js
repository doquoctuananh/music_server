const mongoose = require("mongoose");

const albumSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    imageURL: { type: String },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Album || mongoose.model("Album", albumSchema);
