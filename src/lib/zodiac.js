/** Western zodiac helpers for the profile page. Signs are stored UPPERCASE, as the UI shows them. */

export const ZODIAC_SIGNS = [
  "CAPRICORN", "AQUARIUS", "PISCES", "ARIES", "TAURUS", "GEMINI",
  "CANCER", "LEO", "VIRGO", "LIBRA", "SCORPIO", "SAGITTARIUS",
];

// Day of the month (per month, Jan..Dec) on which the NEXT sign begins.
const CHANGE_DAY = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];

/** month: 1-12, day: 1-31  ->  "SCORPIO" etc. */
export function zodiacFor(month, day) {
  return day < CHANGE_DAY[month - 1] ? ZODIAC_SIGNS[month - 1] : ZODIAC_SIGNS[month % 12];
}

/**
 * Parses "YYYY-MM-DD". Returns { value, month, day } for a real date between
 * 1900 and today, otherwise null.
 */
export function parseBirthDate(input) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(input || ""));
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!real || year < 1900 || date.getTime() > Date.now()) return null;
  return { value: `${match[1]}-${match[2]}-${match[3]}`, month, day };
}
