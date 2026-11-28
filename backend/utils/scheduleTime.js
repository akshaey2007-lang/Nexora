const WEEKDAYS = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6
};

const MONTHS = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12
};

const DEFAULT_PART_OF_DAY_HOURS = {
  morning: { hour: 9, minute: 0 },
  afternoon: { hour: 15, minute: 0 },
  evening: { hour: 18, minute: 0 },
  night: { hour: 20, minute: 0 },
  tonight: { hour: 20, minute: 0 },
  noon: { hour: 12, minute: 0 },
  midday: { hour: 12, minute: 0 },
  midnight: { hour: 0, minute: 0 }
};

/**
 * Validates an IANA timezone string using Intl.DateTimeFormat.
 */
export function isValidTimezone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timeZone.trim() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts wall-clock date/time components for a UTC Date inside a given IANA timezone.
 */
export function getZonedParts(date, timeZone = 'UTC') {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = Number(part.value);
    }
  }

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour === 24 ? 0 : map.hour,
    minute: map.minute,
    second: map.second
  };
}

/**
 * Converts a wall-clock date/time in an IANA timezone to a UTC Date deterministically (handles DST).
 */
export function zonedWallClockToUtc({ year, month, day, hour, minute, second = 0 }, timeZone = 'UTC') {
  const tz = isValidTimezone(timeZone) ? timeZone.trim() : 'UTC';
  const targetAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second, 0);

  let candidateMs = targetAsUtcMs;
  for (let i = 0; i < 3; i += 1) {
    const actualParts = getZonedParts(new Date(candidateMs), tz);
    const actualAsUtcMs = Date.UTC(
      actualParts.year,
      actualParts.month - 1,
      actualParts.day,
      actualParts.hour,
      actualParts.minute,
      actualParts.second,
      0
    );
    const diffMs = targetAsUtcMs - actualAsUtcMs;
    if (diffMs === 0) break;
    candidateMs += diffMs;
  }

  return new Date(candidateMs);
}

/**
 * Formats a Date in a target IANA timezone into separate friendly date and time strings.
 */
export function formatScheduledDateTime(dateInput, timeZone = 'UTC') {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: '', timeLabel: '', iso: '' };
  }
  const tz = isValidTimezone(timeZone) ? timeZone.trim() : 'UTC';
  return {
    dateLabel: date.toLocaleDateString('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    timeLabel: date.toLocaleTimeString('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit'
    }),
    iso: date.toISOString()
  };
}

/**
 * Validates header fields to block CRLF injection and malformed email addresses.
 */
export function validateRecipientList(raw, { required = false } = {}) {
  const value = String(raw || '').trim();
  if (!value) {
    return required ? { valid: false, message: 'Recipient email address is required.' } : { valid: true, normalized: '' };
  }

  if (/[\r\n]/.test(value)) {
    return { valid: false, message: 'Recipient header contains invalid newline characters.' };
  }

  const list = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (list.length === 0) {
    return required ? { valid: false, message: 'Recipient email address is required.' } : { valid: true, normalized: '' };
  }

  if (list.length > 25) {
    return { valid: false, message: 'A maximum of 25 recipients is allowed per field.' };
  }

  const emailRegex = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
  for (const entry of list) {
    const match = entry.match(/<([^>]+)>/);
    const emailPart = (match ? match[1] : entry).trim();
    if (!emailRegex.test(emailPart)) {
      return { valid: false, message: `Invalid email address: "${entry}".` };
    }
  }

  return { valid: true, normalized: list.join(', ') };
}

/**
 * Sanitizes header text like Subject so CRLF header injection is impossible.
 */
export function sanitizeHeaderValue(value, fallback = '') {
  const cleaned = String(value || '').replace(/[\r\n]+/g, ' ').trim();
  return cleaned || fallback;
}

function addDaysToWallClock(parts, days) {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate()
  };
}

function extractTimeFromText(text) {
  // Match explicit clock times like "9 AM", "10:30 am", "16:45", "4pm"
  const clockMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  const ampmMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  const hhmmMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);

  const match = ampmMatch || hhmmMatch;
  if (match) {
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const meridiem = (match[3] || '').toLowerCase();

    if (meridiem) {
      if (hour < 1 || hour > 12) return null;
      if (meridiem === 'pm' && hour !== 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
    } else if (hour < 0 || hour > 23) {
      return null;
    }

    return { hour, minute, matchedPhrase: match[0], explicit: true };
  }

  // Fallback for standalone "at 9" without am/pm when paired with time word
  const atHourMatch = text.match(/\bat\s+(\d{1,2})\b/i);
  if (atHourMatch) {
    const hour = Number(atHourMatch[1]);
    if (hour >= 0 && hour <= 23) {
      return { hour, minute: 0, matchedPhrase: atHourMatch[0], explicit: true };
    }
  }

  for (const [word, timeVal] of Object.entries(DEFAULT_PART_OF_DAY_HOURS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
      return { ...timeVal, matchedPhrase: word, explicit: false };
    }
  }

  void clockMatch;
  return null;
}

/**
 * Deterministically interprets natural-language scheduling phrases into a UTC Date.
 * Examples:
 * - "Send this email tomorrow at 9 AM"
 * - "Schedule this message for Monday at 4 PM"
 * - "Send this email on December 5 at 10:30 AM"
 * - "Send a reminder email next Friday afternoon"
 * - "in 30 minutes" / "in 2 hours"
 */
export function parseNaturalScheduleText(
  text,
  { timezone = 'UTC', referenceDate = new Date() } = {}
) {
  const input = String(text || '').trim();
  const tz = isValidTimezone(timezone) ? timezone.trim() : 'UTC';
  const now = new Date(referenceDate);

  if (!input) {
    return {
      success: false,
      error: 'Please enter a date and time instruction (e.g., "tomorrow at 9 AM").'
    };
  }

  // 1. Direct ISO / RFC timestamp (only if looks like YYYY-MM-DD...)
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2})/.test(input)) {
    const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(input);
    if (hasOffset) {
      const parsed = new Date(input);
      if (!Number.isNaN(parsed.getTime())) {
        return buildSuccessResult(parsed, tz, 'iso');
      }
    } else {
      const [datePart, timePart] = input.split(/[T\s]/);
      const [y, m, d] = datePart.split('-').map(Number);
      const [hh, mm] = (timePart || '09:00').split(':').map(Number);
      const utc = zonedWallClockToUtc({ year: y, month: m, day: d, hour: hh, minute: mm || 0 }, tz);
      return buildSuccessResult(utc, tz, 'iso-local');
    }
  }

  // 2. Relative duration: "in X minutes/hours/days"
  const relMatch = input.match(/\bin\s+(\d+)\s+(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\b/i);
  if (relMatch) {
    const amount = Number(relMatch[1]);
    const unit = relMatch[2].toLowerCase();
    if (amount > 0) {
      const ms = unit.startsWith('min')
        ? amount * 60 * 1000
        : unit.startsWith('h')
        ? amount * 3600 * 1000
        : amount * 86400 * 1000;
      return buildSuccessResult(new Date(now.getTime() + ms), tz, 'relative');
    }
  }

  const nowParts = getZonedParts(now, tz);
  const nowDayJs = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day)).getUTCDay();
  const timeInfo = extractTimeFromText(input) || { hour: 9, minute: 0, explicit: false };

  // 3. Explicit month name date: "December 5", "5 Dec 2026", "Jan 15"
  const monthNamesPattern = Object.keys(MONTHS).join('|');
  const mdyMatch = input.match(
    new RegExp(`\\b(${monthNamesPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i')
  );
  const dmyMatch = input.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNamesPattern})(?:,?\\s+(\\d{4}))?\\b`, 'i')
  );

  if (mdyMatch || dmyMatch) {
    const monthName = (mdyMatch ? mdyMatch[1] : dmyMatch[2]).toLowerCase();
    const day = Number(mdyMatch ? mdyMatch[2] : dmyMatch[1]);
    const explicitYear = Number(mdyMatch ? mdyMatch[3] : dmyMatch[3]);
    const month = MONTHS[monthName];

    if (day >= 1 && day <= 31) {
      let year = explicitYear || nowParts.year;
      let candidate = zonedWallClockToUtc(
        { year, month, day, hour: timeInfo.hour, minute: timeInfo.minute },
        tz
      );
      if (!explicitYear && candidate.getTime() <= now.getTime()) {
        year += 1;
        candidate = zonedWallClockToUtc(
          { year, month, day, hour: timeInfo.hour, minute: timeInfo.minute },
          tz
        );
      }
      return buildSuccessResult(candidate, tz, 'calendar-month-day');
    }
  }

  // 4. Numeric date: "12/05/2026" or "2026-12-05"
  const ymdMatch = input.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (ymdMatch) {
    const candidate = zonedWallClockToUtc(
      {
        year: Number(ymdMatch[1]),
        month: Number(ymdMatch[2]),
        day: Number(ymdMatch[3]),
        hour: timeInfo.hour,
        minute: timeInfo.minute
      },
      tz
    );
    return buildSuccessResult(candidate, tz, 'ymd');
  }

  // 5. "day after tomorrow" / "tomorrow" / "today" / "tonight"
  if (/\bday after tomorrow\b/i.test(input)) {
    const d = addDaysToWallClock(nowParts, 2);
    const utc = zonedWallClockToUtc({ ...d, hour: timeInfo.hour, minute: timeInfo.minute }, tz);
    return buildSuccessResult(utc, tz, 'day-after-tomorrow');
  }

  if (/\btomorrow\b/i.test(input)) {
    const d = addDaysToWallClock(nowParts, 1);
    const utc = zonedWallClockToUtc({ ...d, hour: timeInfo.hour, minute: timeInfo.minute }, tz);
    return buildSuccessResult(utc, tz, 'tomorrow');
  }

  if (/\b(today|tonight|this evening|this afternoon|this morning)\b/i.test(input)) {
    const utc = zonedWallClockToUtc(
      { year: nowParts.year, month: nowParts.month, day: nowParts.day, hour: timeInfo.hour, minute: timeInfo.minute },
      tz
    );
    return buildSuccessResult(utc, tz, 'today');
  }

  // 6. Weekday: "Monday at 4 PM", "next Friday afternoon", "on Wednesday"
  const weekdayPattern = Object.keys(WEEKDAYS).join('|');
  const weekdayMatch = input.match(
    new RegExp(`\\b(?:(next|this)\\s+)?(${weekdayPattern})\\b`, 'i')
  );
  if (weekdayMatch) {
    const qualifier = (weekdayMatch[1] || '').toLowerCase();
    const targetDay = WEEKDAYS[weekdayMatch[2].toLowerCase()];
    let deltaDays = (targetDay - nowDayJs + 7) % 7;

    if (qualifier === 'next') {
      deltaDays = deltaDays === 0 ? 7 : deltaDays + 7;
      // In common English "next Friday" while earlier in the week may mean upcoming Friday or +7;
      // if targetDay is already later this week (> nowDayJs) and qualifier is "next", keep upcoming occurrence if delta < 7?
      // Wait: if today is Wed (3) and user says "next Friday", most people expect next week's or upcoming Friday; wait standard convention if deltaDays - 7 > 0:
      // Let's handle cleanly: if today is same weekday or past it, +7; otherwise if user explicitly says "next Monday" when today is Friday (target 1, delta 3), upcoming Monday IS delta=3! Let's follow intuitive calendar-week vs upcoming rule cleanly:
      if (deltaDays > 7 && deltaDays - 7 > 0) {
        // When today is Tue and target is Fri, upcoming Fri is in 3 days; "next Friday" often means +7 or +3. Wait: to stay safe when deltaDays > 7:
        // Keep deltaDays if user said "next <earlier-or-same-day>", wait: if targetDay > nowDayJs, next Friday in standard chrono = upcoming Friday OR week after. Let's use upcoming week (+7 only when deltaDays === 0 or targetDay <= nowDayJs):
        deltaDays = targetDay <= nowDayJs ? deltaDays : deltaDays - 7;
      }
    }

    const candidateDateParts = addDaysToWallClock(nowParts, deltaDays);
    let candidate = zonedWallClockToUtc(
      { ...candidateDateParts, hour: timeInfo.hour, minute: timeInfo.minute },
      tz
    );
    if (deltaDays === 0 && candidate.getTime() <= now.getTime()) {
      const nextWeekParts = addDaysToWallClock(nowParts, 7);
      candidate = zonedWallClockToUtc(
        { ...nextWeekParts, hour: timeInfo.hour, minute: timeInfo.minute },
        tz
      );
    }
    return buildSuccessResult(candidate, tz, 'weekday');
  }

  // 7. Standalone time today or tomorrow if already passed (e.g., "at 9 AM")
  if (timeInfo && (timeInfo.explicit || /\b(morning|afternoon|evening|night|noon)\b/i.test(input))) {
    let candidate = zonedWallClockToUtc(
      { year: nowParts.year, month: nowParts.month, day: nowParts.day, hour: timeInfo.hour, minute: timeInfo.minute },
      tz
    );
    if (candidate.getTime() <= now.getTime()) {
      const tomorrowParts = addDaysToWallClock(nowParts, 1);
      candidate = zonedWallClockToUtc(
        { ...tomorrowParts, hour: timeInfo.hour, minute: timeInfo.minute },
        tz
      );
    }
    return buildSuccessResult(candidate, tz, 'time-only');
  }

  return {
    success: false,
    error: 'Could not recognize a clear date or time. Try "tomorrow at 9 AM" or "December 5 at 10:30 AM".'
  };
}

function buildSuccessResult(dateObj, timeZone, strategy) {
  const formatted = formatScheduledDateTime(dateObj, timeZone);
  return {
    success: true,
    scheduledAt: dateObj,
    scheduledAtIso: dateObj.toISOString(),
    timezone: timeZone,
    dateLabel: formatted.dateLabel,
    timeLabel: formatted.timeLabel,
    strategy
  };
}

/**
 * Validates and resolves a schedule payload from either ISO timestamp, local date+time+tz, or NL text.
 */
export function resolveScheduledTimestamp({
  scheduledAt,
  localDate,
  localTime,
  timezone = 'UTC',
  naturalLanguageInput = '',
  now = new Date()
}) {
  const tz = isValidTimezone(timezone) ? timezone.trim() : null;
  if (!tz) {
    return { valid: false, message: `Invalid IANA timezone: "${timezone}".` };
  }

  let targetDate = null;

  if (localDate && localTime) {
    const dateMatch = String(localDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeMatch = String(localTime).match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!dateMatch || !timeMatch) {
      return { valid: false, message: 'Date must be YYYY-MM-DD and time must be HH:MM.' };
    }
    targetDate = zonedWallClockToUtc(
      {
        year: Number(dateMatch[1]),
        month: Number(dateMatch[2]),
        day: Number(dateMatch[3]),
        hour: Number(timeMatch[1]),
        minute: Number(timeMatch[2]),
        second: Number(timeMatch[3] || 0)
      },
      tz
    );
  } else if (scheduledAt) {
    const parsed = new Date(scheduledAt);
    if (Number.isNaN(parsed.getTime())) {
      return { valid: false, message: 'Invalid scheduled timestamp.' };
    }
    targetDate = parsed;
  } else if (naturalLanguageInput) {
    const nl = parseNaturalScheduleText(naturalLanguageInput, { timezone: tz, referenceDate: now });
    if (!nl.success) {
      return { valid: false, message: nl.error };
    }
    targetDate = nl.scheduledAt;
  } else {
    return { valid: false, message: 'Please specify a scheduled date and time.' };
  }

  // Enforce strictly future timestamp (allow 30 seconds jitter? Require >= now + 30s or > now)
  if (targetDate.getTime() <= now.getTime()) {
    return { valid: false, message: 'Scheduled time must be in the future.' };
  }

  const maxFutureMs = 365 * 24 * 60 * 60 * 1000;
  if (targetDate.getTime() - now.getTime() > maxFutureMs) {
    return { valid: false, message: 'Scheduled time cannot be more than 1 year in the future.' };
  }

  return {
    valid: true,
    scheduledAt: targetDate,
    timezone: tz,
    formatted: formatScheduledDateTime(targetDate, tz)
  };
}
