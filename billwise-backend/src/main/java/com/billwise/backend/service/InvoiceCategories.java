package com.billwise.backend.service;

import java.util.List;

/**
 * Fixed category taxonomy for MSME invoice classification. Keeping this as a
 * closed list (rather than letting the model invent categories) means the
 * dashboard's category breakdown / GstCategorizer chart stays consistent
 * over time, and it gives us something to validate the AI's answer against.
 */
public final class InvoiceCategories {

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

    public static final String FALLBACK_CATEGORY = "Other";

    private InvoiceCategories() {
    }
}
