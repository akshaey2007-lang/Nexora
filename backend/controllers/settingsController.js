import mongoose from 'mongoose';
import UserSettings from '../models/UserSettings.js';
import { isDbConnected } from '../config/db.js';
import { logger } from '../utils/logger.js';

const DEFAULT_SETTINGS = {
  theme: 'light',
  sidebarCollapsed: false,
  notificationsEnabled: true,
  emailsPerPage: 25,
  signature: '',
  timezone: 'UTC',
  aiEnabled: true,
  aiModelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
};

export async function getSettings(req, res) {
  try {
    if (!isDbConnected() || !req.user?._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
      return res.json({
        success: true,
        settings: req.session?.tempSettings || DEFAULT_SETTINGS
      });
    }

    let settings = await UserSettings.findOne({ userId: req.user._id });
    if (!settings) {
      settings = await UserSettings.create({ userId: req.user._id });
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    logger.error('Failed to get settings', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings'
    });
  }
}

export async function updateSettings(req, res) {
  try {
    const {
      theme,
      sidebarCollapsed,
      notificationsEnabled,
      emailsPerPage,
      signature,
      timezone,
      aiEnabled,
      aiModelId
    } = req.body;

    const merged = {
      ...(req.session?.tempSettings || DEFAULT_SETTINGS),
      ...(theme && { theme }),
      ...(sidebarCollapsed !== undefined && { sidebarCollapsed: Boolean(sidebarCollapsed) }),
      ...(notificationsEnabled !== undefined && { notificationsEnabled: Boolean(notificationsEnabled) }),
      ...(emailsPerPage && { emailsPerPage }),
      ...(signature !== undefined && { signature }),
      ...(timezone && { timezone }),
      ...(aiEnabled !== undefined && { aiEnabled: Boolean(aiEnabled) }),
      ...(aiModelId && typeof aiModelId === 'string' && { aiModelId: aiModelId.trim() })
    };

    if (!isDbConnected() || !req.user?._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
      req.session.tempSettings = merged;
      return req.session.save(() => {
        res.json({
          success: true,
          settings: merged,
          message: 'Settings saved for current session.'
        });
      });
    }

    let settings = await UserSettings.findOne({ userId: req.user._id });
    if (!settings) {
      settings = new UserSettings({ userId: req.user._id });
    }

    if (theme) settings.theme = theme;
    if (sidebarCollapsed !== undefined) settings.sidebarCollapsed = sidebarCollapsed;
    if (notificationsEnabled !== undefined) settings.notificationsEnabled = notificationsEnabled;
    if (emailsPerPage) settings.emailsPerPage = emailsPerPage;
    if (signature !== undefined) settings.signature = signature;
    if (timezone) settings.timezone = timezone;
    if (aiEnabled !== undefined) settings.aiEnabled = Boolean(aiEnabled);
    if (aiModelId && typeof aiModelId === 'string') settings.aiModelId = aiModelId.trim();

    await settings.save();

    res.json({
      success: true,
      settings,
      message: 'Settings successfully saved.'
    });
  } catch (error) {
    logger.error('Failed to update settings', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to save settings'
    });
  }
}
