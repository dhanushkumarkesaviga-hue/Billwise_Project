package com.billwise.gst.service;

import com.billwise.gst.dto.ItcBalance;
import com.billwise.gst.dto.TaxLiability;
import com.billwise.gst.dto.TaxOffsetResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Statutory GSTR-3B Input Tax Credit (ITC) Tax Offset Engine.
 * Enforces Rule 88A / Section 49, 49A, 49B of the CGST Act waterfall:
 * 1. Offset Output IGST using ITC IGST.
 * 2. Offset Output CGST using remaining ITC IGST.
 * 3. Offset Output SGST using remaining ITC IGST.
 * 4. Offset remaining Output CGST using ITC CGST (cannot cross-utilize with SGST).
 * 5. Offset remaining Output SGST using ITC SGST (cannot cross-utilize with CGST).
 * Returns the net cash liability payable per head and remaining ITC balances.
 */
@Service
public class GstOffsetEngine {

    /**
     * Executes the statutory GSTR-3B ITC offset waterfall using strongly-typed DTOs.
     */
    public TaxOffsetResult calculateOffset(TaxLiability liability, ItcBalance itc) {
        Objects.requireNonNull(liability, "Tax liability must not be null");
        Objects.requireNonNull(itc, "ITC balance must not be null");

        return calculateOffset(
                liability.getIgst(),
                liability.getCgst(),
                liability.getSgst(),
                itc.getIgst(),
                itc.getCgst(),
                itc.getSgst()
        );
    }

    /**
     * Executes the statutory GSTR-3B ITC offset waterfall using raw values.
     */
    public TaxOffsetResult calculateOffset(
            BigDecimal outputIgst,
            BigDecimal outputCgst,
            BigDecimal outputSgst,
            BigDecimal itcIgst,
            BigDecimal itcCgst,
            BigDecimal itcSgst
    ) {
        // Normalize and validate non-negative values
        BigDecimal remOutputIgst = normalize(outputIgst, "Output IGST");
        BigDecimal remOutputCgst = normalize(outputCgst, "Output CGST");
        BigDecimal remOutputSgst = normalize(outputSgst, "Output SGST");

        BigDecimal remItcIgst = normalize(itcIgst, "ITC IGST");
        BigDecimal remItcCgst = normalize(itcCgst, "ITC CGST");
        BigDecimal remItcSgst = normalize(itcSgst, "ITC SGST");

        BigDecimal initialOutputIgst = remOutputIgst;
        BigDecimal initialOutputCgst = remOutputCgst;
        BigDecimal initialOutputSgst = remOutputSgst;

        BigDecimal initialItcIgst = remItcIgst;
        BigDecimal initialItcCgst = remItcCgst;
        BigDecimal initialItcSgst = remItcSgst;

        // Step 1: Offset Output IGST using ITC IGST
        BigDecimal igstOffsetByIgst = remOutputIgst.min(remItcIgst);
        remOutputIgst = remOutputIgst.subtract(igstOffsetByIgst);
        remItcIgst = remItcIgst.subtract(igstOffsetByIgst);

        // Step 2: Offset Output CGST using remaining ITC IGST
        BigDecimal cgstOffsetByIgst = remOutputCgst.min(remItcIgst);
        remOutputCgst = remOutputCgst.subtract(cgstOffsetByIgst);
        remItcIgst = remItcIgst.subtract(cgstOffsetByIgst);

        // Step 3: Offset Output SGST using remaining ITC IGST
        BigDecimal sgstOffsetByIgst = remOutputSgst.min(remItcIgst);
        remOutputSgst = remOutputSgst.subtract(sgstOffsetByIgst);
        remItcIgst = remItcIgst.subtract(sgstOffsetByIgst);

        // Step 4: Offset remaining Output CGST using ITC CGST (cannot cross-utilize with SGST)
        BigDecimal cgstOffsetByCgst = remOutputCgst.min(remItcCgst);
        remOutputCgst = remOutputCgst.subtract(cgstOffsetByCgst);
        remItcCgst = remItcCgst.subtract(cgstOffsetByCgst);

        // Step 5: Offset remaining Output SGST using ITC SGST (cannot cross-utilize with CGST)
        BigDecimal sgstOffsetBySgst = remOutputSgst.min(remItcSgst);
        remOutputSgst = remOutputSgst.subtract(sgstOffsetBySgst);
        remItcSgst = remItcSgst.subtract(sgstOffsetBySgst);

        // Remaining net cash liability payable per head
        BigDecimal netCashIgst = remOutputIgst;
        BigDecimal netCashCgst = remOutputCgst;
        BigDecimal netCashSgst = remOutputSgst;
        BigDecimal totalCashPayable = netCashIgst.add(netCashCgst).add(netCashSgst);

        // Remaining unutilized ITC balances carried forward
        BigDecimal remainingItcIgst = remItcIgst;
        BigDecimal remainingItcCgst = remItcCgst;
        BigDecimal remainingItcSgst = remItcSgst;
        BigDecimal totalRemainingItc = remainingItcIgst.add(remainingItcCgst).add(remainingItcSgst);

        return new TaxOffsetResult(
                initialOutputIgst,
                initialOutputCgst,
                initialOutputSgst,
                initialItcIgst,
                initialItcCgst,
                initialItcSgst,
                igstOffsetByIgst,
                cgstOffsetByIgst,
                sgstOffsetByIgst,
                cgstOffsetByCgst,
                sgstOffsetBySgst,
                netCashIgst,
                netCashCgst,
                netCashSgst,
                totalCashPayable,
                remainingItcIgst,
                remainingItcCgst,
                remainingItcSgst,
                totalRemainingItc
        );
    }

    private BigDecimal normalize(BigDecimal value, String name) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(name + " cannot be negative: " + value);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
