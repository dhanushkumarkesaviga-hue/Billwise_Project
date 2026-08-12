package com.billwise.backend.entity;

// Role based access control:
//  - SUPER_ADMIN platform owner: manage merchants, approve/reject verifications.
//  - ADMIN       merchant owner: manage invoices, tenant settings, staff users.
//  - ACCOUNTANT  day-to-day operator: create/edit/approve invoices, cannot manage tenant settings.
//  - VIEWER      read-only access to dashboards, invoices, and reports.
public enum Role {
    SUPER_ADMIN,
    ADMIN,
    ACCOUNTANT,
    VIEWER
}
