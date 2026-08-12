package com.billwise.backend.security;

import java.util.Map;
import java.util.regex.Pattern;

public final class GstValidationUtil {

    private static final String CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final Pattern GSTIN_PATTERN = Pattern.compile("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$");
    private static final Pattern PAN_PATTERN = Pattern.compile("^[A-Z]{5}[0-9]{4}[A-Z]{1}$");

    public static final Map<String, String> STATE_CODES = Map.ofEntries(
            Map.entry("01", "Jammu and Kashmir"),
            Map.entry("02", "Himachal Pradesh"),
            Map.entry("03", "Punjab"),
            Map.entry("04", "Chandigarh"),
            Map.entry("05", "Uttarakhand"),
            Map.entry("06", "Haryana"),
            Map.entry("07", "Delhi"),
            Map.entry("08", "Rajasthan"),
            Map.entry("09", "Uttar Pradesh"),
            Map.entry("10", "Bihar"),
            Map.entry("11", "Sikkim"),
            Map.entry("12", "Arunachal Pradesh"),
            Map.entry("13", "Nagaland"),
            Map.entry("14", "Manipur"),
            Map.entry("15", "Mizoram"),
            Map.entry("16", "Tripura"),
            Map.entry("17", "Meghalaya"),
            Map.entry("18", "Assam"),
            Map.entry("19", "West Bengal"),
            Map.entry("20", "Jharkhand"),
            Map.entry("21", "Odisha"),
            Map.entry("22", "Chhattisgarh"),
            Map.entry("23", "Madhya Pradesh"),
            Map.entry("24", "Gujarat"),
            Map.entry("26", "Dadra and Nagar Haveli and Daman and Diu"),
            Map.entry("27", "Maharashtra"),
            Map.entry("29", "Karnataka"),
            Map.entry("30", "Goa"),
            Map.entry("31", "Lakshadweep"),
            Map.entry("32", "Kerala"),
            Map.entry("33", "Tamil Nadu"),
            Map.entry("34", "Puducherry"),
            Map.entry("35", "Andaman and Nicobar Islands"),
            Map.entry("36", "Telangana"),
            Map.entry("37", "Andhra Pradesh"),
            Map.entry("38", "Ladakh")
    );

    private GstValidationUtil() {}

    /**
     * Validates GSTIN structure and Mod-36 checksum.
     */
    public static boolean isValidGstin(String gstin) {
        if (gstin == null) return false;
        String clean = gstin.trim().toUpperCase();
        if (!GSTIN_PATTERN.matcher(clean).matches()) return false;

        String stateCode = clean.substring(0, 2);
        if (!STATE_CODES.containsKey(stateCode)) return false;

        char expectedCheckDigit = calculateMod36Checksum(clean.substring(0, 14));
        return clean.charAt(14) == expectedCheckDigit;
    }

    /**
     * Calculates the Mod-36 checksum character for the first 14 characters of a GSTIN.
     */
    public static char calculateMod36Checksum(String first14) {
        if (first14 == null || first14.length() < 14) {
            throw new IllegalArgumentException("Input must be at least 14 characters");
        }
        String clean = first14.toUpperCase();
        int sum = 0;

        for (int i = 0; i < 14; i++) {
            char c = clean.charAt(i);
            int charVal = CHARS.indexOf(c);
            if (charVal == -1) {
                throw new IllegalArgumentException("Invalid character in GSTIN: " + c);
            }
            int factor = (i % 2 == 0) ? 1 : 2;
            int cp = charVal * factor;
            int q = cp / 36;
            int r = cp % 36;
            sum += (q + r);
        }

        int remainder = sum % 36;
        int checkVal = (36 - remainder) % 36;
        return CHARS.charAt(checkVal);
    }

    /**
     * Extracts PAN (chars 3 to 12) from GSTIN.
     */
    public static String extractPan(String gstin) {
        if (gstin == null || gstin.trim().length() < 12) return null;
        String pan = gstin.trim().toUpperCase().substring(2, 12);
        return PAN_PATTERN.matcher(pan).matches() ? pan : null;
    }

    /**
     * Extracts state code and name from GSTIN.
     */
    public static String getStateName(String stateCode) {
        return STATE_CODES.getOrDefault(stateCode, "Unknown State");
    }
}
