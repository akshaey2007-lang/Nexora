import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    displayName: {
      type: String,
      default: ''
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    // Encrypted with AES-256-GCM. Never stored in plain text.
    encryptedRefreshToken: {
      type: String,
      default: null
    },
    encryptedAccessToken: {
      type: String,
      default: null
    },
    tokenExpiry: {
      type: Number,
      default: null
    },
    isConnected: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    googleId: this.googleId,
    email: this.email,
    displayName: this.displayName,
    avatarUrl: this.avatarUrl,
    isConnected: this.isConnected,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt
  };
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
