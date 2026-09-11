package com.billwise.invoice.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;

public class GstDeadlineRuleEngine {

    // Category 1 States (South & West India - 22nd due date for QRMP GSTR-3B)
    private static final Set<String> CATEGORY_1_STATE_CODES = Set.of(
            "24", // Gujarat
            "27", // Maharashtra
            "29", // Karnataka
            "30", // Goa
            "32", // Kerala
            "33", // Tamil Nadu
            "36", // Telangana
            "37", // Andhra Pradesh
            "22", // Chhattisgarh
            "23", // Madhya Pradesh
            "25", // Daman & Diu, Dadra & Nagar Haveli
            "31", // Lakshadweep
            "34", // Puducherry
            "35"  // Andaman & Nicobar
    );

    public static boolean isCategory1State(String stateCode) {
        if (stateCode == null || stateCode.length() < 2) return false;
        return CATEGORY_1_STATE_CODES.contains(stateCode.substring(0, 2));
    }

    public static String getStateCategoryName(String stateCode) {
        return isCategory1State(stateCode)
                ? "Category 1 (South & West - Due 22nd for QRMP)"
                : "Category 2 (North & East - Due 24th for QRMP)";
    }

    public static int getQrmpGstr3bDueDay(String stateCode) {
        return isCategory1State(stateCode) ? 22 : 24;
    }

    public static List<Map<String, Object>> generateSchedule(
            String gstin,
            String stateCode,
            String taxpayerType,
            String turnoverSlab,
            String filingFrequency,
            LocalDate referenceDate
    ) {
        if (referenceDate == null) referenceDate = LocalDate.now();
        List<Map<String, Object>> list = new ArrayList<>();

        boolean isComposition = "COMPOSITION".equalsIgnoreCase(taxpayerType);
        boolean isQrmp = "QRMP_QUARTERLY".equalsIgnoreCase(filingFrequency) && !isComposition;
        boolean isAbove5Cr = "ABOVE_5_CR".equalsIgnoreCase(turnoverSlab);
        boolean isAbove2Cr = isAbove5Cr || "1_5_TO_5_CR".equalsIgnoreCase(turnoverSlab);

        int currentMonth = referenceDate.getMonthValue();
        int currentYear = referenceDate.getYear();

        if (isComposition) {
            // CMP-08 (Quarterly: 18th of month following quarter)
            LocalDate nextCmp08Due = getNextQuarterDueDate(referenceDate, 18);
            list.add(createDeadline(
                    "CMP-08",
                    "Quarterly Tax Statement & Self-Assessed Payment",
                    "Quarterly",
                    nextCmp08Due,
                    referenceDate,
                    "Composition dealers statement for quarterly payment of self-assessed tax under Section 39.",
                    50,
                    10000,
                    "Late fee of ₹50/day and interest on unpaid tax liability"
            ));

            // GSTR-4 (Annual: 30th April)
            int gstr4Year = currentMonth > 4 ? currentYear + 1 : currentYear;
            LocalDate gstr4Due = LocalDate.of(gstr4Year, 4, 30);
            list.add(createDeadline(
                    "GSTR-4",
                    "Annual Return for Composition Taxpayers",
                    "Annual",
                    gstr4Due,
                    referenceDate,
                    "Annual summary of outward supplies, inward supplies and taxes paid for composition taxpayers.",
                    50,
                    10000,
                    "Mandatory annual return under Section 39(2)"
            ));
        } else if (isQrmp) {
            // QRMP Schedule
            int qrmpDueDay = getQrmpGstr3bDueDay(stateCode);

            // GSTR-1 (Quarterly: 13th post quarter)
            LocalDate nextGstr1Due = getNextQuarterDueDate(referenceDate, 13);
            list.add(createDeadline(
                    "GSTR-1",
                    "Quarterly Statement of Outward Supplies (QRMP)",
                    "Quarterly",
                    nextGstr1Due,
                    referenceDate,
                    "Quarterly return for furnishing details of outward supplies of goods and services under QRMP scheme.",
                    50,
                    5000,
                    "Delays block recipient ITC claims and invite late fee"
            ));

            // GSTR-3B (Quarterly: 22nd or 24th post quarter)
            LocalDate nextGstr3bDue = getNextQuarterDueDate(referenceDate, qrmpDueDay);
            String categoryLabel = isCategory1State(stateCode) ? "Category 1 State (Due 22nd)" : "Category 2 State (Due 24th)";
            list.add(createDeadline(
                    "GSTR-3B",
                    "Quarterly Summary Return & Tax Settlement (" + categoryLabel + ")",
                    "Quarterly",
                    nextGstr3bDue,
                    referenceDate,
                    "Quarterly summary return and net tax settlement under QRMP scheme. Staggered due date based on state.",
                    50,
                    5000,
                    "Attracts 18% p.a. interest and late fees on cash tax liability"
            ));

            // PMT-06 (Challan for Month 1 & Month 2: 25th of following month)
            LocalDate pmt06Due = getNextMonthDueDate(referenceDate, 25);
            list.add(createDeadline(
                    "PMT-06",
                    "Monthly Tax Payment Challan (QRMP M1/M2)",
                    "Monthly",
                    pmt06Due,
                    referenceDate,
                    "Payment of 35% fixed sum or self-assessed tax for month 1 and month 2 of the quarter under QRMP.",
                    0,
                    0,
                    "Non-payment incurs 18% p.a. statutory interest until quarter settlement"
            ));
        } else {
            // Regular Monthly Schedule
            LocalDate nextGstr1Due = getNextMonthDueDate(referenceDate, 11);
            list.add(createDeadline(
                    "GSTR-1",
                    "Monthly Statement of Outward Supplies",
                    "Monthly",
                    nextGstr1Due,
                    referenceDate,
                    "Mandatory monthly return for outward supplies of goods or services under Section 37.",
                    50,
                    10000,
                    "Recipients cannot claim ITC if GSTR-1 is delayed beyond the 11th"
            ));

            LocalDate nextGstr3bDue = getNextMonthDueDate(referenceDate, 20);
            list.add(createDeadline(
                    "GSTR-3B",
                    "Monthly Summary Return & Tax Payment",
                    "Monthly",
                    nextGstr3bDue,
                    referenceDate,
                    "Self-assessed summary return for payment of net tax liability and availing eligible ITC.",
                    50,
                    10000,
                    "Attracts ₹50/day late fee + 18% interest p.a. on cash ledger balance"
            ));

            LocalDate gstr2bDate = getNextMonthDueDate(referenceDate, 14);
            list.add(createDeadline(
                    "GSTR-2B",
                    "Auto-Drafted Static ITC Statement",
                    "Monthly",
                    gstr2bDate,
                    referenceDate,
                    "Static statement of available and restricted ITC generated automatically on the 14th of each month.",
                    0,
                    0,
                    "Crucial reference for matching and availing input tax credit in GSTR-3B"
            ));
        }

        // Annual Returns: GSTR-9 (Mandatory if > 2 Cr) & GSTR-9C (Mandatory if > 5 Cr)
        int gstr9Year = currentMonth == 12 ? currentYear : (currentMonth > 3 ? currentYear : currentYear - 1);
        LocalDate gstr9Due = LocalDate.of(gstr9Year, 12, 31);
        if (gstr9Due.isBefore(referenceDate)) {
            gstr9Due = LocalDate.of(gstr9Year + 1, 12, 31);
        }

        if (isAbove2Cr) {
            list.add(createDeadline(
                    "GSTR-9",
                    "Statutory Annual Return (Mandatory for > Rs. 2 Cr Turnover)",
                    "Annual",
                    gstr9Due,
                    referenceDate,
                    "Consolidated annual return for financial year under Section 44(1). Mandatory for turnover above Rs. 2 Crore.",
                    50,
                    10000,
                    "Section 47 late fee of Rs. 50/day (0.04% of turnover cap)"
            ));
        }

        if (isAbove5Cr) {
            list.add(createDeadline(
                    "GSTR-9C",
                    "Self-Certified Reconciliation Statement (Mandatory for > Rs. 5 Cr Turnover)",
                    "Annual",
                    gstr9Due,
                    referenceDate,
                    "Self-certified reconciliation statement between audited annual financial statements and GSTR-9.",
                    50,
                    10000,
                    "Statutory requirement for enterprises exceeding Rs. 5 Crore aggregate turnover"
            ));
        }

        list.sort(Comparator.comparing(m -> (String) m.get("dueDate")));
        return list;
    }

    private static LocalDate getNextMonthDueDate(LocalDate ref, int dueDay) {
        LocalDate currentMonthDue = LocalDate.of(ref.getYear(), ref.getMonthValue(), Math.min(dueDay, ref.lengthOfMonth()));
        if (ref.isBefore(currentMonthDue) || ref.isEqual(currentMonthDue)) {
            return currentMonthDue;
        }
        YearMonth nextMonth = YearMonth.from(ref).plusMonths(1);
        return nextMonth.atDay(Math.min(dueDay, nextMonth.lengthOfMonth()));
    }

    private static LocalDate getNextQuarterDueDate(LocalDate ref, int dueDay) {
        int month = ref.getMonthValue();
        int quarterEndMonth;
        int quarterEndYear = ref.getYear();

        if (month <= 3) {
            quarterEndMonth = 3;
        } else if (month <= 6) {
            quarterEndMonth = 6;
        } else if (month <= 9) {
            quarterEndMonth = 9;
        } else {
            quarterEndMonth = 12;
        }

        YearMonth followingMonth = YearMonth.of(quarterEndYear, quarterEndMonth).plusMonths(1);
        LocalDate quarterDueDate = followingMonth.atDay(Math.min(dueDay, followingMonth.lengthOfMonth()));

        if (ref.isAfter(quarterDueDate)) {
            followingMonth = followingMonth.plusMonths(3);
            quarterDueDate = followingMonth.atDay(Math.min(dueDay, followingMonth.lengthOfMonth()));
        }

        return quarterDueDate;
    }

    private static Map<String, Object> createDeadline(
            String formName,
            String title,
            String frequency,
            LocalDate dueDate,
            LocalDate referenceDate,
            String description,
            int lateFeePerDay,
            int maxPenalty,
            String impact
    ) {
        long daysRemaining = ChronoUnit.DAYS.between(referenceDate, dueDate);
        String status = daysRemaining < 0 ? "Overdue" : (daysRemaining <= 3 ? "Upcoming (Urgent)" : "Upcoming");

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", formName.toLowerCase().replace("-", "") + "_" + dueDate);
        map.put("formName", formName);
        map.put("title", title);
        map.put("frequency", frequency);
        map.put("dueDate", dueDate.toString());
        map.put("daysRemaining", daysRemaining);
        map.put("status", status);
        map.put("description", description);
        map.put("lateFeePerDay", lateFeePerDay);
        map.put("maxPenalty", maxPenalty);
        map.put("impact", impact);
        map.put("isNearDeadline", daysRemaining >= 0 && daysRemaining <= 3);
        return map;
    }
}
