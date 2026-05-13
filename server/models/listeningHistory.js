const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    song: { type: mongoose.Schema.Types.ObjectId, ref: "Song", required: true },
    playedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.models.ListeningHistory || mongoose.model("ListeningHistory", historySchema);
