import mongoose from 'mongoose';
import crypto from 'crypto';

export const SCHEDULED_STATUSES = ['Scheduled', 'Processing', 'Sent', 'Failed', 'Cancelled'];

const scheduledEmailSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recipient: {
      type: String,
      required: true,
      trim: true
    },
    cc: {
      type: String,
      default: '',
      trim: true
    },
    bcc: {
      type: String,
      default: '',
      trim: true
    },
    subject: {
      type: String,
      default: '(No Subject)',
      trim: true
    },
    body: {
      type: String,
      default: ''
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    },
    naturalLanguageInput: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: SCHEDULED_STATUSES,
      default: 'Scheduled',
      index: true
    },
    gmailDraftId: {
      type: String,
      default: null
    },
    gmailMessageId: {
      type: String,
      default: null
    },
    idempotencyKey: {
      type: String,
      default: () => crypto.randomUUID(),
      unique: true,
      index: true
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    nextRetryAt: {
      type: Date,
      default: null
    },
    lockedAt: {
      type: Date,
      default: null
    },
    lockedBy: {
      type: String,
      default: null
    },
    sentAt: {
      type: Date,
      default: null
    },
    errorDetails: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

scheduledEmailSchema.index({ status: 1, scheduledAt: 1, nextRetryAt: 1 });
scheduledEmailSchema.index({ userId: 1, status: 1, scheduledAt: 1 });

scheduledEmailSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    recipient: this.recipient,
    cc: this.cc,
    bcc: this.bcc,
    subject: this.subject,
    body: this.body,
    scheduledAt: this.scheduledAt,
    timezone: this.timezone,
    naturalLanguageInput: this.naturalLanguageInput,
    status: this.status,
    gmailDraftId: this.gmailDraftId,
    gmailMessageId: this.gmailMessageId,
    retryCount: this.retryCount,
    maxRetries: this.maxRetries,
    nextRetryAt: this.nextRetryAt,
    sentAt: this.sentAt,
    errorDetails: this.errorDetails,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const ScheduledEmail =
  mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', scheduledEmailSchema);

export default ScheduledEmail;
