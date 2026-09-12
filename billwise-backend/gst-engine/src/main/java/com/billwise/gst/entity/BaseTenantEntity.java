package com.billwise.gst.entity;

import com.billwise.gst.context.TenantContext;
import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import lombok.Getter;
import lombok.Setter;

/**
 * Base mapped superclass for all multi-tenant JPA entities.
 * Automatically injects the tenant_id discriminator from TenantContext prior to persist.
 */
@MappedSuperclass
@Getter
@Setter
public abstract class BaseTenantEntity {

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private String tenantId;

    @PrePersist
    public void populateTenantId() {
        if (this.tenantId == null || this.tenantId.trim().isEmpty()) {
            String contextTenant = TenantContext.getTenantId();
            if (contextTenant == null || contextTenant.trim().isEmpty()) {
                throw new IllegalStateException("TenantContext must contain a valid tenantId before persisting BaseTenantEntity");
            }
            this.tenantId = contextTenant.trim();
        }
    }
}
