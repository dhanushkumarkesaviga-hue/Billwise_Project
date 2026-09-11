package com.billwise.common.util;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.Locale;

/**
 * Flexible LocalDate deserializer that handles standard ISO (yyyy-MM-dd),
 * common Indian date formats (dd/MM/yyyy, dd-MM-yyyy, dd-MMM-yyyy),
 * and ISO timestamps gracefully without throwing 500 exceptions.
 */
public class FlexibleLocalDateDeserializer extends JsonDeserializer<LocalDate> {

    private static final DateTimeFormatter[] FORMATTERS = new DateTimeFormatter[]{
            DateTimeFormatter.ISO_LOCAL_DATE,                     // 2026-09-04
            DateTimeFormatter.ofPattern("d/M/yyyy"),              // 4/9/2026 or 18/04/2019
            DateTimeFormatter.ofPattern("d-M-yyyy"),              // 4-9-2026 or 18-04-2019
            DateTimeFormatter.ofPattern("d.M.yyyy"),              // 18.04.2019
            new DateTimeFormatterBuilder()
                    .parseCaseInsensitive()
                    .appendPattern("d-MMM-yyyy")
                    .toFormatter(Locale.ENGLISH),                 // 18-Apr-2019
            new DateTimeFormatterBuilder()
                    .parseCaseInsensitive()
                    .appendPattern("d/MMM/yyyy")
                    .toFormatter(Locale.ENGLISH),                 // 18/Apr/2019
            new DateTimeFormatterBuilder()
                    .parseCaseInsensitive()
                    .appendPattern("d MMM yyyy")
                    .toFormatter(Locale.ENGLISH),                 // 18 Apr 2019
            DateTimeFormatter.ofPattern("yyyy/MM/dd"),            // 2026/09/04
            DateTimeFormatter.ofPattern("yyyy.MM.dd")             // 2026.09.04
    };

    @Override
    public LocalDate deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String text = p.getText();
        if (text == null || text.isBlank()) {
            return null;
        }

        String cleaned = text.trim();
        if (cleaned.contains("T")) {
            cleaned = cleaned.substring(0, cleaned.indexOf("T"));
        }

        for (DateTimeFormatter formatter : FORMATTERS) {
            try {
                return LocalDate.parse(cleaned, formatter);
            } catch (Exception ignored) {
            }
        }

        try {
            String[] parts = cleaned.split("[/\\-.]");
            if (parts.length == 3 && parts[2].length() == 2) {
                String fixed = parts[0] + "-" + parts[1] + "-20" + parts[2];
                for (DateTimeFormatter formatter : FORMATTERS) {
                    try {
                        return LocalDate.parse(fixed, formatter);
                    } catch (Exception ignored) {
                    }
                }
            }
        } catch (Exception ignored) {
        }

        return null;
    }
}
