import UserSettings from '../models/UserSettings.js';
import { logger } from '../utils/logger.js';

export async function getSettings(req, res) {
  try {
    if (req.isDemo) {
      return res.json({
        success: true,
        settings: {
          theme: 'light',
          sidebarCollapsed: false,
          notificationsEnabled: true,
          emailsPerPage: 25,
          signature: '--\nSent with NEXORA MAIL',
          timezone: 'UTC'
        }
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
    const { theme, sidebarCollapsed, notificationsEnabled, emailsPerPage, signature, timezone } = req.body;

    if (req.isDemo) {
      return res.json({
        success: true,
        settings: {
          theme: theme || 'light',
          sidebarCollapsed: Boolean(sidebarCollapsed),
          notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : true,
          emailsPerPage: emailsPerPage || 25,
          signature: signature || '',
          timezone: timezone || 'UTC'
        },
        message: 'Settings updated (Demo session)'
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
