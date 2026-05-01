const mongoose = require("mongoose");

const metricSchema = new mongoose.Schema(
  {
    metricKey: { type: String, required: true, trim: true, minlength: 1, maxlength: 64 },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    current: { type: mongoose.Schema.Types.Decimal128, required: true },
    target: { type: mongoose.Schema.Types.Decimal128, required: true },
    unit: { type: String, required: true, maxlength: 12 },
  },
  {
    _id: false,
    id: false,
  }
);

const startupProgressSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    stage: { type: String, enum: ["idea", "mvp", "traction", "growth", "scale"], required: true },
    weeklyFocus: { type: String, required: true, maxlength: 2000 },
    metrics: { type: [metricSchema], required: true, default: [] },
  },
  {
    collection: "startup_progress",
    timestamps: true,
  }
);


module.exports =
  mongoose.models.StartupProgress || mongoose.model("StartupProgress", startupProgressSchema);
