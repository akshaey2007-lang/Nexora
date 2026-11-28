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

const PART_OF_DAY = {
  morning: { hour: 9, minute: 0 },
  afternoon: { hour: 15, minute: 0 },
  evening: { hour: 18, minute: 0 },
  night: { hour: 20, minute: 0 },
  tonight: { hour: 20, minute: 0 },
  noon: { hour: 12, minute: 0 },
  midday: { hour: 12, minute: 0 },
  midnight: { hour: 0, minute: 0 }
};

export function isValidTimezone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timeZone.trim() });
    return true;
  } catch {
    return false;
  }
}

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
    const diff = targetAsUtcMs - actualAsUtcMs;
    if (diff === 0) break;
    candidateMs += diff;
  }

  return new Date(candidateMs);
}

export function formatScheduledDateTime(dateInput, timeZone = 'UTC') {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: '', timeLabel: '', localDateInput: '', localTimeInput: '', iso: '' };
  }
  const tz = isValidTimezone(timeZone) ? timeZone.trim() : 'UTC';
  const parts = getZonedParts(date, tz);
  const pad = (n) => String(n).padStart(2, '0');

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
    localDateInput: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    localTimeInput: `${pad(parts.hour)}:${pad(parts.minute)}`,
    iso: date.toISOString()
  };
}

function addDays(parts, days) {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate()
  };
}

function extractTime(text) {
  const ampm = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  const hhmm = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const match = ampm || hhmm;

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
    return { hour, minute, explicit: true };
  }

  const atHour = text.match(/\bat\s+(\d{1,2})\b/i);
  if (atHour) {
    const hour = Number(atHour[1]);
    if (hour >= 0 && hour <= 23) {
      return { hour, minute: 0, explicit: true };
    }
  }

  for (const [word, time] of Object.entries(PART_OF_DAY)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
      return { ...time, explicit: false };
    }
  }
  return null;
}

/**
 * Deterministic browser-side parser for natural-language schedule commands.
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
      error: 'Enter a schedule instruction such as "tomorrow at 9 AM" or "Monday at 4 PM".'
    };
  }

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
      return buildResult(new Date(now.getTime() + ms), tz, now);
    }
  }

  const nowParts = getZonedParts(now, tz);
  const nowDow = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day)).getUTCDay();
  const timeInfo = extractTime(input) || { hour: 9, minute: 0, explicit: false };

  const monthsPattern = Object.keys(MONTHS).join('|');
  const mdyMatch = input.match(
    new RegExp(`\\b(${monthsPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i')
  );
  const dmyMatch = input.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthsPattern})(?:,?\\s+(\\d{4}))?\\b`, 'i')
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
      return buildResult(candidate, tz, now);
    }
  }

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
    return buildResult(candidate, tz, now);
  }

  if (/\bday after tomorrow\b/i.test(input)) {
    const d = addDays(nowParts, 2);
    return buildResult(zonedWallClockToUtc({ ...d, hour: timeInfo.hour, minute: timeInfo.minute }, tz), tz, now);
  }

  if (/\btomorrow\b/i.test(input)) {
    const d = addDays(nowParts, 1);
    return buildResult(zonedWallClockToUtc({ ...d, hour: timeInfo.hour, minute: timeInfo.minute }, tz), tz, now);
  }

  if (/\b(today|tonight|this evening|this afternoon|this morning)\b/i.test(input)) {
    const candidate = zonedWallClockToUtc(
      { year: nowParts.year, month: nowParts.month, day: nowParts.day, hour: timeInfo.hour, minute: timeInfo.minute },
      tz
    );
    return buildResult(candidate, tz, now);
  }

  const weekdayPattern = Object.keys(WEEKDAYS).join('|');
  const weekdayMatch = input.match(new RegExp(`\\b(?:(next|this)\\s+)?(${weekdayPattern})\\b`, 'i'));
  if (weekdayMatch) {
    const qualifier = (weekdayMatch[1] || '').toLowerCase();
    const targetDay = WEEKDAYS[weekdayMatch[2].toLowerCase()];
    let deltaDays = (targetDay - nowDow + 7) % 7;

    if (qualifier === 'next' && targetDay <= nowDow) {
      deltaDays = deltaDays === 0 ? 7 : deltaDays + 7;
    }

    const d = addDays(nowParts, deltaDays);
    let candidate = zonedWallClockToUtc({ ...d, hour: timeInfo.hour, minute: timeInfo.minute }, tz);
    if (deltaDays === 0 && candidate.getTime() <= now.getTime()) {
      const nextWeek = addDays(nowParts, 7);
      candidate = zonedWallClockToUtc({ ...nextWeek, hour: timeInfo.hour, minute: timeInfo.minute }, tz);
    }
    return buildResult(candidate, tz, now);
  }

  if (timeInfo && (timeInfo.explicit || /\b(morning|afternoon|evening|night|noon)\b/i.test(input))) {
    let candidate = zonedWallClockToUtc(
      { year: nowParts.year, month: nowParts.month, day: nowParts.day, hour: timeInfo.hour, minute: timeInfo.minute },
      tz
    );
    if (candidate.getTime() <= now.getTime()) {
      const tomorrow = addDays(nowParts, 1);
      candidate = zonedWallClockToUtc({ ...tomorrow, hour: timeInfo.hour, minute: timeInfo.minute }, tz);
    }
    return buildResult(candidate, tz, now);
  }

  return {
    success: false,
    error: 'Could not interpret date/time. Try "tomorrow at 9 AM" or "Monday at 4 PM".'
  };
}

function buildResult(candidate, timezone, now) {
  if (Number.isNaN(candidate.getTime())) {
    return { success: false, error: 'Invalid date value.' };
  }
  if (candidate.getTime() <= now.getTime()) {
    return {
      success: false,
      error: 'That date/time is in the past. Please specify a future time.'
    };
  }
  const formatted = formatScheduledDateTime(candidate, timezone);
  return {
    success: true,
    scheduledAt: candidate,
    scheduledAtIso: candidate.toISOString(),
    timezone,
    ...formatted
  };
}
