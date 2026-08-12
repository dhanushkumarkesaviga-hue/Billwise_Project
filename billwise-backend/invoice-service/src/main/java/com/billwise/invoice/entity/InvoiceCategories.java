package com.billwise.invoice.entity;

import java.util.List;

public final class InvoiceCategories {

    private InvoiceCategories() {}

    public static final List<String> ALLOWED_CATEGORIES = List.of(
            "Raw Materials",
            "Capital Goods & Office Assets",
            "Cloud Infrastructure",
            "Software & Subscriptions",
            "Freight & Transport",
            "Food & Entertainment",
            "Professional & Legal Services",
            "Utilities",
            "Rent & Facilities",
            "Marketing & Advertising",
            "Office Supplies & Stationery",
            "Insurance",
            "Travel & Conveyance",
            "Repairs & Maintenance",
            "Other"
    );

    public static final String DEFAULT_CATEGORY = "Other";

    public static boolean isValid(String category) {
        if (category == null) return false;
        return ALLOWED_CATEGORIES.stream().anyMatch(c -> c.equalsIgnoreCase(category.trim()));
    }
}
