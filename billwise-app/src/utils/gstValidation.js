// GSTIN Structure & Mod-36 Checksum Validation Utility

export const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const STATE_CODES = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh"
};


/**
 * Calculates the Mod-36 checksum character for the first 14 characters of a GSTIN.
 */
export function calculateGstinChecksum(first14) {
  if (!first14 || first14.length < 14) return null;
  const clean = first14.toUpperCase();
  let sum = 0;

  for (let i = 0; i < 14; i++) {
    const c = clean[i];
    const charVal = GSTIN_CHARS.indexOf(c);
    if (charVal === -1) return null;

    const factor = (i % 2 === 0) ? 1 : 2;
    const cp = charVal * factor;
    const q = Math.floor(cp / 36);
    const r = cp % 36;
    sum += (q + r);
  }

  const remainder = sum % 36;
  const checkVal = (36 - remainder) % 36;
  return GSTIN_CHARS[checkVal];
}

/**
 * Extracts PAN (Characters 3 to 12) from a GSTIN.
 */
export function extractPanFromGstin(gstin) {
  if (!gstin || gstin.trim().length < 12) return '';
  const pan = gstin.trim().toUpperCase().substring(2, 12);
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan) ? pan : '';
}

/**
 * Validates full 15-character GSTIN with live status feedback.
 */
export function validateGstin(gstin) {
  if (!gstin) {
    return { isValid: false, status: 'EMPTY', message: 'Please enter a 15-character GSTIN' };
  }

  const clean = gstin.trim().toUpperCase();

  if (clean.length < 15) {
    return {
      isValid: false,
      status: 'INCOMPLETE',
      length: clean.length,
      message: `${15 - clean.length} character(s) remaining`
    };
  }

  if (clean.length > 15) {
    return { isValid: false, status: 'TOO_LONG', message: 'GSTIN cannot exceed 15 characters' };
  }

  // Regex format check
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(clean)) {
    return {
      isValid: false,
      status: 'INVALID_FORMAT',
      message: 'Invalid GSTIN format (Expected: 2-digit State + 10-char PAN + Entity Code + Z + Checksum)'
    };
  }

  const stateCode = clean.substring(0, 2);
  const stateName = STATE_CODES[stateCode];
  if (!stateName) {
    return {
      isValid: false,
      status: 'INVALID_STATE',
      message: `Invalid state code '${stateCode}'. Must be between 01 and 38.`
    };
  }

  const computedChecksum = calculateGstinChecksum(clean.substring(0, 14));
  const actualChecksum = clean[14];

  if (actualChecksum !== computedChecksum) {
    return {
      isValid: false,
      status: 'CHECKSUM_FAILED',
      stateName,
      stateCode,
      pan: extractPanFromGstin(clean),
      computedChecksum,
      actualChecksum,
      message: `Checksum digit mismatch (Expected '${computedChecksum}', but got '${actualChecksum}')`
    };
  }

  return {
    isValid: true,
    status: 'VALID',
    cleanGstin: clean,
    stateName,
    stateCode,
    pan: extractPanFromGstin(clean),
    checksum: actualChecksum,
    message: `Valid GSTIN verified (${stateName})`
  };
}
