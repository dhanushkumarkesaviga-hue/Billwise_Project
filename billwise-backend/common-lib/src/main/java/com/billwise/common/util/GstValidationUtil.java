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

    public static boolean isValidStateCode(String stateCode) {
        if (stateCode == null) return false;
        return STATE_CODE_MAP.containsKey(stateCode.trim());
    }

    public static boolean isValidGstinFormat(String gstin) {
        if (gstin == null) return false;
        String clean = gstin.trim().toUpperCase();
        return GSTIN_PATTERN.matcher(clean).matches();
    }

    public static Character calculateChecksum(String first14) {
        if (first14 == null || first14.length() < 14) return null;
        String clean = first14.trim().toUpperCase();
        try {
            int sum = 0;
            for (int i = 0; i < 14; i++) {
                int codePoint = CHAR_SET.indexOf(clean.charAt(i));
                if (codePoint == -1) return null;
                int factor = (i % 2 == 0) ? 1 : 2;
                int digit = factor * codePoint;
                digit = (digit / 36) + (digit % 36);
                sum += digit;
            }
            int remainder = sum % 36;
            int expectedCheckPoint = (36 - remainder) % 36;
            return CHAR_SET.charAt(expectedCheckPoint);
        } catch (Exception e) {
            return null;
        }
    }

    public static boolean verifyChecksum(String gstin) {
        if (!isValidGstinFormat(gstin)) return false;
        String clean = gstin.trim().toUpperCase();
        try {
            Character expected = calculateChecksum(clean.substring(0, 14));
            if (expected == null) return false;
            return clean.charAt(14) == expected;
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean isValidGstin(String gstin) {
        if (gstin == null) return false;
        String clean = gstin.trim().toUpperCase();
        if (clean.length() != 15) return false;
        if (!isValidGstinFormat(clean)) return false;
        if (!isValidStateCode(extractStateCode(clean))) return false;
        return verifyChecksum(clean);
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
