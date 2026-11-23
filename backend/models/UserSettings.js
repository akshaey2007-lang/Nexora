import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light'
    },
    sidebarCollapsed: {
      type: Boolean,
      default: false
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    emailsPerPage: {
      type: Number,
      default: 25,
      min: 10,
      max: 100
    },
    signature: {
      type: String,
      default: '--\nSent with NEXORA MAIL'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  {
    timestamps: true
  }
);

const UserSettings = mongoose.models.UserSettings || mongoose.model('UserSettings', userSettingsSchema);
export default UserSettings;
