const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, minlength: 3, maxlength: 320 },
    avatar: { type: String, required: true, minlength: 1, maxlength: 8 },
    roleTitle: { type: String, maxlength: 120 },
    skills: {
      type: [{ type: String, maxlength: 80 }],
      default: [],
    },
    emailVerified: { type: Boolean, required: true, default: false },
    isActive: { type: Boolean, required: true, default: true },
    deletedAt: { type: Date, default: null },
  },
  {
    collection: "users",
    timestamps: true,
  }
);

userSchema.index({ email: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);