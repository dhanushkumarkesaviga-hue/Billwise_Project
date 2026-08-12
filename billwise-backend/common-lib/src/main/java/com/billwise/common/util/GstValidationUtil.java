package com.billwise.common.util;

import java.util.Map;
import java.util.regex.Pattern;

public class GstValidationUtil {

    private static final Pattern GSTIN_PATTERN = Pattern.compile("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$");
    private static final Pattern PAN_PATTERN = Pattern.compile("^[A-Z]{5}[0-9]{4}[A-Z]{1}$");

    private static final String CHAR_SET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    private static final Map<String, String> STATE_CODE_MAP = Map.ofEntries(
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
            Map.entry("19", "West Bengal"),
            Map.entry("24", "Gujarat"),
            Map.entry("27", "Maharashtra"),
            Map.entry("29", "Karnataka"),
            Map.entry("32", "Kerala"),
            Map.entry("33", "Tamil Nadu"),
            Map.entry("36", "Telangana")
    );

    public static boolean isValidGstinFormat(String gstin) {
        if (gstin == null) return false;
        String clean = gstin.trim().toUpperCase();
        return GSTIN_PATTERN.matcher(clean).matches();
    }

    public static boolean verifyChecksum(String gstin) {
        if (!isValidGstinFormat(gstin)) return false;
        String clean = gstin.trim().toUpperCase();
        try {
            int factor = 1;
            int sum = 0;
            int checkCodePoint = CHAR_SET.indexOf(clean.charAt(14));

            for (int i = 0; i < 14; i++) {
                int codePoint = CHAR_SET.indexOf(clean.charAt(i));
                if (codePoint == -1) return false;
                int digit = factor * codePoint;
                factor = (factor == 2) ? 1 : 2;
                digit = (digit / 36) + (digit % 36);
                sum += digit;
            }

            int remainder = sum % 36;
            int expectedCheckPoint = (36 - remainder) % 36;
            return checkCodePoint == expectedCheckPoint;
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean matchesPan(String gstin, String pan) {
        if (gstin == null || pan == null) return false;
        String cleanGstin = gstin.trim().toUpperCase();
        String cleanPan = pan.trim().toUpperCase();
        if (cleanGstin.length() < 12) return false;
        String extractedPan = cleanGstin.substring(2, 12);
        return extractedPan.equalsIgnoreCase(cleanPan);
    }

    public static boolean isValidPan(String pan) {
        if (pan == null) return false;
        return PAN_PATTERN.matcher(pan.trim().toUpperCase()).matches();
    }

    public static String getStateFromStateCode(String stateCode) {
        if (stateCode == null) return "Unknown";
        return STATE_CODE_MAP.getOrDefault(stateCode.trim(), "Other State/UT (" + stateCode + ")");
    }

    public static String extractStateCode(String gstin) {
        if (gstin == null || gstin.trim().length() < 2) return "";
        return gstin.trim().substring(0, 2);
    }

    public static String extractPan(String gstin) {
        if (gstin == null || gstin.trim().length() < 12) return "";
        return gstin.trim().substring(2, 12).toUpperCase();
    }
}
