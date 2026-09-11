/**
 * Indian Goods & Services Tax (GST) Utilities
 * Handles State Codes, GSTIN parsing, Inter vs Intra state classification,
 * and real-time statutory tax calculations.
 */

export const INDIAN_STATE_CODES = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '96': 'Other Territory / Export / SEZ'
};

export const COMMON_GST_RATES = [0, 5, 12, 18, 28];

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Extracts 2-digit state code from GSTIN or cleans input
 */
export function extractStateCode(input) {
  if (!input) return '';
  const trimmed = String(input).trim().toUpperCase();
  if (trimmed.length >= 2 && /^\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 2);
  }
  return trimmed;
}

/**
 * Gets State name from 2-digit code
 */
export function getStateName(stateCode) {
  if (!stateCode) return 'Unspecified';
  const clean = extractStateCode(stateCode);
  return INDIAN_STATE_CODES[clean] || `State (${clean})`;
}

/**
 * Validates 15-character GSTIN format
 */
export function isValidGstinFormat(gstin) {
  if (!gstin) return false;
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

/**
 * Auto-calculates CGST, SGST, IGST, and Total Amount
 */
export function calculateGstBreakdown({
  taxableAmount = 0,
  gstRate = 18,
  supplierStateCode = '27',
  customerGstin = '',
  placeOfSupply = '',
  supplyType = 'B2B'
}) {
  const taxable = Math.max(0, Number(taxableAmount) || 0);
  const rate = Number(gstRate) || 0;

  // 1. Export / SEZ zero-rated treatment
  if (supplyType === 'EXPORT' || supplyType === 'SEZ') {
    return {
      taxableAmount: taxable,
      gstRate: rate,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
      totalAmount: taxable,
      isInterstate: true,
      taxDistributionLabel: `${supplyType} (Zero-Rated Supply under LUT/Bond)`
    };
  }

  // 2. Determine Recipient State Code
  const suppState = extractStateCode(supplierStateCode) || '27';
  let recipState = '';
  if (customerGstin && customerGstin.trim().length >= 2) {
    recipState = extractStateCode(customerGstin);
  } else if (placeOfSupply) {
    recipState = extractStateCode(placeOfSupply);
  } else {
    recipState = suppState; // default intrastate if unregistered local
  }

  const isInterstate = suppState !== recipState;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterstate) {
    igst = Math.round((taxable * (rate / 100)) * 100) / 100;
  } else {
    const halfRate = rate / 2;
    cgst = Math.round((taxable * (halfRate / 100)) * 100) / 100;
    sgst = Math.round((taxable * (halfRate / 100)) * 100) / 100;
  }

  const totalTax = Math.round((cgst + sgst + igst) * 100) / 100;
  const totalAmount = Math.round((taxable + totalTax) * 100) / 100;

  const taxDistributionLabel = isInterstate
    ? `Interstate Supply (IGST: ${rate}%)`
    : `Intrastate Supply (CGST: ${rate / 2}% + SGST: ${rate / 2}%)`;

  return {
    taxableAmount: taxable,
    gstRate: rate,
    cgst,
    sgst,
    igst,
    totalTax,
    totalAmount,
    isInterstate,
    supplierStateCode: suppState,
    recipientStateCode: recipState,
    taxDistributionLabel
  };
}
