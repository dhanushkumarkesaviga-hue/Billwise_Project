export const INITIAL_INVOICES = [
  {
    id: "INV-2026-0891",
    vendorName: "Apex Cloud Technologies Pvt Ltd",
    gstin: "27AAACA1234F1Z5",
    invoiceNumber: "ACT-89104",
    invoiceDate: "2026-07-28",
    dueDate: "2026-08-27",
    category: "Cloud Infrastructure",
    hsnSac: "998313",
    taxableAmount: 45000,
    gstRate: 18,
    cgst: 4050,
    sgst: 4050,
    igst: 0,
    totalAmount: 53100,
    itcEligibility: "Eligible",
    itcAmount: 8100,
    rcmApplicable: false,
    status: "Approved",
    paymentStatus: "Paid",
    ocrConfidence: 98.4,
    notes: "Monthly server hosting & load balancer setup",
    rawFileUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60"
  },
  {
    id: "INV-2026-0892",
    vendorName: "National Logistics & Freight Solutions",
    gstin: "07BBBCC5678G2Z9",
    invoiceNumber: "NLFS/AUG/102",
    invoiceDate: "2026-08-01",
    dueDate: "2026-08-15",
    category: "Freight & Transport",
    hsnSac: "996511",
    taxableAmount: 28500,
    gstRate: 5,
    cgst: 0,
    sgst: 0,
    igst: 1425,
    totalAmount: 29925,
    itcEligibility: "Eligible (RCM)",
    itcAmount: 1425,
    rcmApplicable: true,
    status: "Pending",
    paymentStatus: "Unpaid",
    ocrConfidence: 96.1,
    notes: "Goods transport agency charges for North Zone delivery",
    rawFileUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60"
  },
  {
    id: "INV-2026-0893",
    vendorName: "ErgoFurniture Works India",
    gstin: "29DDDEE9012H3Z1",
    invoiceNumber: "EFW-2026-991",
    invoiceDate: "2026-07-15",
    dueDate: "2026-08-14",
    category: "Capital Goods & Office Assets",
    hsnSac: "940330",
    taxableAmount: 120000,
    gstRate: 28,
    cgst: 16800,
    sgst: 16800,
    igst: 0,
    totalAmount: 153600,
    itcEligibility: "Eligible",
    itcAmount: 33600,
    rcmApplicable: false,
    status: "Approved",
    paymentStatus: "Paid",
    ocrConfidence: 99.1,
    notes: "Ergonomic mesh chairs and standing desks for team expansion",
    rawFileUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop&q=60"
  },
  {
    id: "INV-2026-0894",
    vendorName: "Grand Palace Hotel & Catering",
    gstin: "07AAACG9988K1Z3",
    invoiceNumber: "GPH-4412",
    invoiceDate: "2026-07-29",
    dueDate: "2026-07-29",
    category: "Food & Entertainment",
    hsnSac: "996331",
    taxableAmount: 14200,
    gstRate: 5,
    cgst: 355,
    sgst: 355,
    igst: 0,
    totalAmount: 14910,
    itcEligibility: "Ineligible (Sec 17(5))",
    itcAmount: 0,
    rcmApplicable: false,
    status: "Flagged",
    paymentStatus: "Paid",
    ocrConfidence: 94.8,
    notes: "Client dinner & catering event - Blocked ITC under GST Sec 17(5)(b)",
    rawFileUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=60"
  },
  {
    id: "INV-2026-0895",
    vendorName: "Mahavir Industrial Hardware & Tools",
    gstin: "27KKKLL4455M1Z8",
    invoiceNumber: "MIH/26-27/044",
    invoiceDate: "2026-08-02",
    dueDate: "2026-08-31",
    category: "Raw Materials",
    hsnSac: "731815",
    taxableAmount: 84000,
    gstRate: 18,
    cgst: 7560,
    sgst: 7560,
    igst: 0,
    totalAmount: 99120,
    itcEligibility: "Eligible",
    itcAmount: 15120,
    rcmApplicable: false,
    status: "Pending",
    paymentStatus: "Unpaid",
    ocrConfidence: 97.2,
    notes: "Stainless steel fasteners & industrial hardware batch #3",
    rawFileUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60"
  }
];

export const SAMPLE_SCAN_TEMPLATES = [
  {
    title: "ICICI Lombard Insurance Tax Invoice (Real Test Case)",
    vendorName: "ICICI Lombard General Insurance Company Limited",
    gstin: "21AAACI7904G1ZN",
    invoiceNumber: "1002251984503",
    taxableAmount: 10217,
    gstRate: 18,
    cgst: 919.53,
    sgst: 919.53,
    igst: 0,
    totalAmount: 12056.06,
    hsnSac: "997133",
    category: "Insurance",
    itcEligibility: "Ineligible (Sec 17(5))",
    notes: "Group Health & Personal Accident Insurance Policy (Blocked ITC under Sec 17(5)(b))",
    rawOcrText: `É? 1CICT1 LOMBARD
ICICI Lombard General Insurance Company Limited
Registered Office: ICICI Lombard House, 414 Veer Savarkar Marg, Near Siddhivinayak Temple, Prabhadevi, Mumbai 400025.
IRDA Reg. No. 115 | CIN: L67200MH2000PLC129408
Bill from Address: Plot No 12, Unit 4, Bhubaneswar, Odisha - 751001
GSTIN: 21AAACI7904G1ZN | PAN: AAACI7904G | State: Odisha (21)

TAX INVOICE
Invoice Number : 1002251984503
Invoice Date : 28/07/2026
Place of Supply: Odisha (21)

GSTIN/Unique Id of registered recipient: 21AABCW1961A1ZZ
Name of Registered Recipient: Customer Enterprise Pvt Ltd
Address of Recipient: Cuttack Road, Bhubaneswar, Odisha

----------------------------------------------------------------------------------------------------
Particulars & Service Description                     | HSN/SAC | Rate | Taxable Value (INR)
----------------------------------------------------------------------------------------------------
Group Health & Personal Accident Insurance Policy     | 997133  | 18%  | 10,217.00
----------------------------------------------------------------------------------------------------

Total value of services (Premium Value without Tax): 10,217.00
CGST (9%): 919.53
SGST (9%): 919.53
Total Tax Amount: 1,839.06
Total Premium inclusive Tax: 12,056.06

Total in Words: INR Twelve Thousand Fifty Six and Six Paise Only
Authorised Signatory for ICICI Lombard General Insurance Company Limited`
  },
  {
    title: "Gujarat Freight Hardware (Multi-Total-Row Test Case)",
    vendorName: "Gujarat Freight & Engineering Tools Pvt Ltd",
    gstin: "24AAACG8890P1Z4",
    invoiceNumber: "GFET-4490",
    taxableAmount: 3805,
    gstRate: 18,
    cgst: 0,
    sgst: 0,
    igst: 684.90,
    totalAmount: 4490,
    hsnSac: "8302",
    category: "Raw Materials",
    itcEligibility: "Eligible",
    notes: "Industrial Brass Hinges & Hardware Tools (Disambiguates line-item subtotal vs. tax summary vs. words total)",
    rawOcrText: `Gujarat Freight & Engineering Tools Pvt Ltd
Plot 44, GIDC Industrial Estate, Sanand, Gujarat - 382110
GSTIN: 24AAACG8890P1Z4 | State: Gujarat (24)
TAX INVOICE
Invoice No: GFET-4490
Invoice Date: 08/08/2026

Billed To / Buyer:
Shri Ram Enterprise
GSTIN: 27AAACA1234F1Z5
Mumbai, Maharashtra (27)

Line Items:
Sr No | Item Description | HSN/SAC | Qty | Rate | Amount
1 | Industrial Brass Hinges Heavy Duty | 8302 | 2 NOS | 2245.00 | 4490.00
Total | 2 NOS | ₹4,490.00

Total in words: FOUR THOUSAND FOUR HUNDRED AND NINETY RUPEES ONLY

Tax Summary:
HSN/SAC | Taxable Value | IGST % | IGST Amount | Total Tax
8302 | 3,805.00 | 18.00 | 684.90 | 684.90
Total | 3,805.00 | 18.00 | 684.90 | 684.90

Total Tax in words: SIX HUNDRED AND EIGHTY-FOUR RUPEES AND NINETY PAISA ONLY
Authorised Signatory for Gujarat Freight & Engineering Tools Pvt Ltd`
  },
  {
    title: "Gujarat Freight & Heavy Tools (2-Page Out-of-Sequence)",
    vendorName: "Gujarat Freight & Engineering Tools Pvt Ltd",
    gstin: "24AAACG8890P1Z4",
    invoiceNumber: "GFET/2026/099",
    taxableAmount: 115000,
    gstRate: 18,
    hsnSac: "996511",
    category: "Freight & Transport",
    itcEligibility: "Eligible",
    notes: "Interstate heavy machinery hydraulic haulage & transport tooling",
    isMultiPageDemo: true,
    pagesOutSeq: [
      {
        id: "demo-p2",
        name: "Page-2-Totals-Bank-Signatory.jpg",
        previewUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60",
        ocrText: `TAX INVOICE CONTINUED
Subtotal / Taxable Value: INR 1,15,000.00
IGST (18%): INR 20,700.00
Total Tax Amount: INR 20,700.00
GRAND TOTAL (INCL. TAX): INR 1,35,700.00
Total in Words: Rupees One Lakh Thirty Five Thousand Seven Hundred Only

Bank Details for NEFT / RTGS:
Bank Name: HDFC Bank Ltd | Branch: Ahmedabad Industrial Estate
Account Number: 50200088991122 | IFSC Code: HDFC0001234
Pay using UPI: gujaratfreight@hdfcbank

Terms and Conditions:
1. Interest @ 18% per annum will be charged if payment is not made within 30 days.
2. Subject to Ahmedabad jurisdiction.
3. E. & O.E.

For Gujarat Freight & Engineering Tools Pvt Ltd
Authorised Signatory
Customer Signature: _______________________`
      },
      {
        id: "demo-p1",
        name: "Page-1-Header-LineItems.jpg",
        previewUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60",
        ocrText: `==================================================
TAX INVOICE
ORIGINAL FOR RECIPIENT
==================================================
Supplier: Gujarat Freight & Engineering Tools Pvt Ltd
Plot 44, GIDC Industrial Estate, Sanand, Gujarat - 382110
GSTIN: 24AAACG8890P1Z4 | PAN: AAACG8890P
State: Gujarat (24) | Place of Supply: Maharashtra (27)

Invoice No: GFET/2026/099
Invoice Date: 10/08/2026
Reverse Charge (RCM): No
Billed To / Buyer:
BillWise Enterprises Private Limited
GSTIN: 27AAACB1234F1Z5
Mumbai, Maharashtra (27)

--------------------------------------------------
LINE ITEMS & PARTICULARS
--------------------------------------------------
Sr. No | Description of Goods / Services | HSN/SAC | Qty | Rate (INR) | Taxable Value
1. Heavy Hydraulic Trailer Machinery Haulage Sanand to Pune | 996511 | 1 Trip | 85,000.00 | 85,000.00
2. Industrial Fastener Anchor Mounting Tooling Set | 731815 | 2 Sets | 15,000.00 | 30,000.00`
      }
    ]
  },
  {
    title: "SaaS Software Subscription",
    vendorName: "CloudScale Analytics Inc",
    gstin: "9926USA00192Z1",
    invoiceNumber: "CSA-2026-9042",
    taxableAmount: 18500,
    gstRate: 18,
    hsnSac: "998315",
    category: "Software & Subscriptions",
    itcEligibility: "Eligible",
    notes: "AI Business Intelligence monthly plan"
  },
  {
    title: "Raw Material Shipment",
    vendorName: "Surya Polymer Compounds",
    gstin: "24AAACS3344P1Z0",
    invoiceNumber: "SPC/INV/5512",
    taxableAmount: 64000,
    gstRate: 18,
    hsnSac: "390110",
    category: "Raw Materials",
    itcEligibility: "Eligible",
    notes: "HDPE Granules Grade A batch delivery"
  }
];
