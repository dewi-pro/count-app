import moment from 'moment';

/**
 * Formats an ISO date string into a readable "DD/MM/YYYY HH:mm" format.
 * @param {string} iso - The ISO date string.
 * @returns {string} The formatted date string or "-".
 */
export const formatDateTime = (iso) => {
  if (!iso) return "-";
  return moment(iso).format("DD/MM/YYYY HH:mm");
};

/**
 * Extracts a number from a string that may contain text (e.g., "haid 4 days").
 * @param {string} str - The input string.
 * @returns {number} The extracted number or 0 if not found.
 */
export const extractNumberFromString = (str) => {
  if (typeof str !== 'string' || !str) {
    return 0;
  }
  
  // A regular expression to find the first sequence of digits, including a decimal point
  const match = str.match(/(\d+\.?\d*)/);

  if (match && match[1]) {
    // Convert the extracted number string to a float
    return parseFloat(match[1]);
  }

  // Return 0 if no number is found
  return 0;
};

/**
 * Converts a decimal number of days into a "days hours" string.
 * @param {number} decimalDays - The number of days as a decimal.
 * @returns {string} The formatted string (e.g., "2 days 5 hours").
 */
export const convertDaysToDaysAndHours = (decimalDays) => {
    
  if (typeof decimalDays !== 'number' || isNaN(decimalDays)) {
    // If input is not a number, try to extract one from it.
    decimalDays = extractNumberFromString(decimalDays);
  }

  // Get the whole number of days
  const days = Math.floor(decimalDays);
  
  // Get the decimal part and multiply by 24 to get hours
  const fractionalPart = decimalDays - days;
  const hours = Math.round(fractionalPart * 24);

  // Handle pluralization for days and hours
  const daysString = 'D';
  const hoursString = 'H';

  if (hours === 0) {
    return `${days} ${daysString}`;
  }

  if (days === 0) {
      return `${hours} ${hoursString}`;
  }
  
  return `${days} ${daysString} , ${hours} ${hoursString}`;
};

/**
 * Formats a number to a fixed 2 decimal places, removing ".00" if present.
 * @param {number} num - The input number.
 * @returns {string|"-"} The formatted number string or "-".
 */
export const formatDecimalDays = (num) => {
  if (num === null || isNaN(num)) return "-";
  const formatted = num.toFixed(2);
  if (formatted.endsWith(".00")) {
    return formatted.slice(0, -3);
  }
  return formatted;
};

/**
 * Parses a duration string (e.g., "2 days", "5 hours") into a number of days.
 * @param {string} durationString - The duration string.
 * @returns {number|null} The number of days or null if invalid.
 */
export const parseDurationToDays = (durationString) => {
  if (!durationString || durationString === "-") return null;
  const parts = durationString.split(" ");
  const value = parseFloat(parts[0]);
  const unit = parts[1];
  if (unit === "D") {
    return value;
  } else if (unit === "H") {
    return value / 24;
  }
  return null;
};

/**
 * Extracts the number of days from a "haid" hukum string, including hours.
 * @param {string} hukumString - The hukum string.
 * @returns {number|null} The number of haid days or null.
 */
export const parseHukumHaidPartFromString = (hukumString) => {
  if (!hukumString) return null;
  // Regex to match "haid X days" or "haid X days, Y hours"
  const haidMatch = hukumString.match(/haid\s*(\d+)\s*days(?:\s*,\s*(\d+)\s*hours?)?/);
  
  if (haidMatch && haidMatch[1]) {
    const days = parseFloat(haidMatch[1]);
    const hours = haidMatch[2] ? parseFloat(haidMatch[2]) : 0;
    return days + (hours / 24);
  }
  
  // Fallback for simple decimal format
  const simpleMatch = hukumString.match(/haid\s*(\d+\.?\d*)/);
  if (simpleMatch && simpleMatch[1]) {
    return parseFloat(simpleMatch[1]);
  }

  return null;
};

/**
 * Extracts the number of days from an "istihadoh" hukum string.
 * @param {string} hukumString - The hukum string.
 * @returns {number|null} The number of istihadoh days or null.
 */
export const parseHukumIstihadohPartFromString = (hukumString) => {
  if (!hukumString) return null;
  let istihadohMatch = hukumString.match(/istihadoh (\d+(\.\d+)?)/);
  if (!istihadohMatch) {
    istihadohMatch = hukumString.match(/ist (\d+(\.\d+)?)/);
  }
  if (istihadohMatch && istihadohMatch[1]) {
    return parseFloat(istihadohMatch[1]);
  }
  return null;
};

/**
 * Calculates the difference in days between two date-time strings (B and KD).
 * @param {object} entry - The data entry object.
 * @returns {string} The formatted difference or "-".
 */
export const diffBKD = (entry) => {
  if (!entry.B || !entry.KD) return "-";
  const b = new Date(entry.B);
  const kd = new Date(entry.KD);
  const diff = b - kd;
  if (diff <= 0) return "-";

  const hours = diff / (1000 * 60 * 60);
  if (hours < 24) {
    return `${hours.toFixed(1)} H`;
  } else {
    let days = hours / 24;
    return `${days.toFixed(2)} D`;
  }
};

/**
 * Calculates the total B days between two consecutive entries.
 * @param {number} i - The current index.
 * @param {array} sortedEntries - The sorted list of entries.
 * @returns {string} The formatted number of days or "-".
 */
export const getTotalBDays = (i, sortedEntries) => {
  const b = sortedEntries[i]?.B;
  const nextKD = sortedEntries[i - 1]?.KD;
  if (!b || !nextKD) return "-";
  const bDate = new Date(b);
  const nextKDDate = new Date(nextKD);
  const diff = nextKDDate - bDate;
  const days = diff / (1000 * 60 * 60 * 24);
  return diff <= 0 ? "-" : `${formatDecimalDays(days)} D`;
};
