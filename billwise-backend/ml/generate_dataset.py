"""
BillWise — Custom ML Invoice Category Dataset Generator
Generates a labeled dataset of realistic Indian GST OCR-extracted invoice texts
for all 15 BillWise taxonomy categories.
"""

import os
import json
import random
import pandas as pd

ALLOWED_CATEGORIES = [
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
]

# Domain-specific templates, vendors, line items, and SAC/HSN codes per category
CATEGORY_PROFILES = {
    "Raw Materials": {
        "hsn": ["7208", "731815", "390110", "2804", "5208", "7601", "3204", "390720", "2915", "8207", "8480"],
        "vendors": [
            "Mahavir Industrial Hardware & Tools", "Surya Polymer Compounds", "Jindal Steel & Alloys Ltd",
            "Bharat Chemicals & Polymers", "Tata Pigments & Metals", "National Fasteners & Bolts",
            "Shree Balaji Textile Yarn Mills", "Riddhi Siddhi Resin & Adhesive Co", "Universal Aluminium Extrusions",
            "Gujarat Petrochem Intermediates", "Apex Industrial Raw Materials Pvt Ltd", "Vardhman Yarns & Threads",
            "Sudarshan Chemical Industries", "Hindalco Metal Works", "Supreme Plastic Pellets & Resins",
            "Manufacturing & Supply of Precision Press Tool & Room Component", "Shree Ganesh Tool Room & Moulds",
            "Precision Tooling & Components Pvt Ltd", "Standard Metal Stamping & Dies", "Balaji Fasteners & Hardware"
        ],
        "items": [
            ("Stainless steel fasteners M8 & industrial hardware batch #3", "731815", 84000),
            ("HDPE Granules Grade A Virgin Polymer Pellets 500kg", "390110", 64000),
            ("Cold Rolled Steel Sheets 2.5mm CRCA coils", "7208", 125000),
            ("Industrial Sulphuric Acid 98% commercial grade 2000L", "2804", 42000),
            ("Combed Cotton Yarn 30s count 50 bales", "5208", 98000),
            ("Aluminium Ingot Grade 6063-T6 2 Metric Tons", "7601", 340000),
            ("Synthetic Organic Pigments & Textile Dyes Blue-15", "3204", 56000),
            ("Epoxy Resin Binder & Hardener System 250kg drum", "390720", 78000),
            ("Acetic Acid Glacial industrial solvent bulk drum", "2915", 38500),
            ("Copper wire rods 8mm electrolytic tough pitch", "7408", 185000),
            ("Mild Steel angle bars & channel sections 50x50x6", "7216", 72000),
            ("Polypropylene Homopolymer (PP) raffia grade bags", "3902", 91000),
            ("Precision Press Tool Dies & Punches alloy steel D2/HCHCR", "8207", 145000),
            ("Tool room components, guide pillars, bushes & ejector pins", "8480", 52000),
            ("Sheet metal stamping raw sheet strip coils 1.2mm", "7211", 68000)
        ]
    },
    "Capital Goods & Office Assets": {
        "hsn": ["847130", "940330", "847141", "844332", "841510", "847989", "852852", "841869", "851712", "851713", "851762"],
        "vendors": [
            "ErgoFurniture Works India", "Dell Technologies India Pvt Ltd", "HP India Sales Private Limited",
            "Lenovo Enterprise Solutions", "Godrej & Boyce Interio Division", "Canon India Business Machines",
            "Daikin Airconditioning India", "Featherlite Workspaces Pvt Ltd", "Siemens Heavy Industrial Machinery",
            "Samsung Commercial Displays", "Kirloskar Diesel Generator Sets", "Voltas Commercial Cooling",
            "Ace Mobile Manufacturer Pvt Ltd", "Foxconn Technology India", "Dixon Technologies Consumer Electronics",
            "Apple India Retail & Enterprise", "Xiaomi Technology India", "OnePlus Enterprise Devices"
        ],
        "items": [
            ("Ergonomic mesh chairs and standing motorized desks for team", "940330", 120000),
            ("Dell Latitude 5440 Core i7 16GB RAM 512GB SSD Laptops 5 units", "847130", 385000),
            ("HP Enterprise Rack Server ProLiant DL380 Gen10 Xeon", "847141", 540000),
            ("Canon imageRUNNER ADVANCE Heavy Duty Multi-function Photocopier", "844332", 175000),
            ("Daikin 3.0 Ton Inverter Cassette Commercial Air Conditioner", "841510", 145000),
            ("Modular acoustic meeting pod 4-seater soundproof booth", "940310", 220000),
            ("Samsung 65-inch 4K UHD Commercial Conference Room Interactive Display", "852852", 95000),
            ("Heavy CNC vertical milling machine tooling fixture", "845710", 850000),
            ("Kirloskar 25 kVA Silent DG Set generator with AMF panel", "850211", 280000),
            ("High-density motorized mobile compactor storage racking system", "940320", 160000),
            ("Enterprise 5G Smartphones & Handsets 10 units for field ops", "851713", 195000),
            ("Smart Mobile Devices, barcode scanners & industrial mobile terminals", "851712", 88000),
            ("Cisco Gigabit Ethernet switch router & telecom gateway hardware", "851762", 112000)
        ]
    },
    "Cloud Infrastructure": {
        "hsn": ["998313", "998315", "998319", "998314"],
        "vendors": [
            "Apex Cloud Technologies Pvt Ltd", "Amazon Web Services India Pvt Ltd (AWS)",
            "Microsoft Azure Cloud Infrastructure", "Google Cloud India Private Limited",
            "DigitalOcean India Cloud Services", "Cloudflare Global Edge Networks",
            "Hetzner Online Compute Services", "E2E Networks Cloud Platform India",
            "Linode Akamai Cloud Infrastructure", "Tata Communications IZO Cloud Services",
            "CtrlS Datacenters Cloud Hosting", "Yotta Data Services Private Limited"
        ],
        "items": [
            ("Monthly EC2 compute clusters, RDS PostgreSQL Multi-AZ & S3 Storage", "998313", 45000),
            ("Azure Kubernetes Service (AKS) node pool & Premium SSD Managed Disks", "998313", 68500),
            ("Google Cloud Platform BigQuery analytics slots and Cloud Storage egress", "998313", 52000),
            ("Dedicated Cloud Server hosting, load balancer setup & VPC peering bandwidth", "998313", 31000),
            ("Enterprise CDN caching, DDoS attack mitigation & SSL edge termination", "998315", 22000),
            ("Managed Redis cluster hosting & elastic container registry storage", "998313", 18500),
            ("Virtual private cloud direct connect link 1Gbps bandwidth Mumbai region", "998314", 42000),
            ("Object storage archival bucket 50TB & outbound data transfer", "998313", 14800)
        ]
    },
    "Software & Subscriptions": {
        "hsn": ["998315", "998314", "998319", "998313"],
        "vendors": [
            "CloudScale Analytics Inc", "Atlassian Software Systems India", "GitHub Enterprise Services LLC",
            "Slack Technologies Salesforce India", "Zoho Corporation Private Limited", "JetBrains s.r.o.",
            "Adobe Systems India Private Limited", "Notion Labs Workspace Software", "Figma Design Platform",
            "Docker Inc Container Subscription", "Intuit QuickBooks Online India", "Datadog Monitoring Platform",
            "NextGen NextGen Services", "SLN Softwares & IT Solutions", "InfoSys Digital Solutions",
            "Wipro SaaS Platforms", "Innovatech Software Development & Subscriptions"
        ],
        "items": [
            ("AI Business Intelligence monthly plan - 25 user seats", "998315", 18500),
            ("Jira Software Premium & Confluence Cloud Annual Subscription 50 seats", "998315", 145000),
            ("GitHub Enterprise Cloud annual license per seat renewal", "998315", 85000),
            ("Slack Business+ workspace plan for 40 team members", "998315", 36000),
            ("Zoho One All-in-one suite employee license yearly billing", "998315", 54000),
            ("JetBrains All Products Pack subscription for developers", "998315", 42000),
            ("Adobe Creative Cloud Enterprise annual all apps subscription", "998315", 96000),
            ("Figma Organization tier design system license 10 editors", "998315", 28000),
            ("Datadog infrastructure APM synthetic monitoring SaaS subscription", "998315", 62000),
            ("Postman Enterprise API platform team license", "998315", 34000),
            ("Enterprise Software License, portal maintenance & user subscription", "998315", 48000),
            ("Web Application SaaS Platform maintenance & cloud software subscription", "998314", 32000)
        ]
    },
    "Freight & Transport": {
        "hsn": ["996511", "996512", "996519", "996531"],
        "vendors": [
            "National Logistics & Freight Solutions", "Blue Dart Express Limited", "VRL Logistics Ltd",
            "Delhivery Express Supply Chain", "TCI Freight Transport Corporation of India",
            "Safechem Cargo Movers Pvt Ltd", "Gati Kintetsu Express Logistics", "Allcargo Freight Forwarders",
            "DTDC Courier & Cargo Services", "Container Corporation of India (CONCOR)",
            "Western Carriers India Ltd", "Speedage Express Logistics", "Southern Roadways Transport"
        ],
        "items": [
            ("Goods transport agency charges for North Zone delivery full truck load", "996511", 28500),
            ("Air cargo express priority freight delivery consignment #BLR-DEL-9081", "996512", 16400),
            ("Interstate container freight haulage Mumbai Nhava Sheva to Bhiwandi", "996519", 42000),
            ("Door to door surface parcel courier delivery charges 120 boxes", "996511", 9800),
            ("Hydraulic axle trailer heavy machinery transport Bangalore to Pune", "996511", 115000),
            ("Refrigerated reefer container cold chain logistics transport", "996511", 58000),
            ("Local tempo transit and carton loading / unloading cartage", "996511", 8200),
            ("Express document & sample docket courier air tariff across India", "996512", 4500),
            ("Full truckload road freight transportation and delivery charges", "996511", 38000)
        ]
    },
    "Food & Entertainment": {
        "hsn": ["996331", "996332", "996333", "996337"],
        "vendors": [
            "Grand Palace Hotel & Catering", "Barbeque Nation Hospitality Ltd", "Mainland China Restaurant",
            "Sodexo Food & Facilities Management", "Haldiram Caterers & Banquets", "Taj Gateway Dining & Banquets",
            "Blue Tokai Coffee Roasters", "Third Wave Food & Beverages", "Chai Point Corporate Catering",
            "The Oberoi Hotel & Dining", "Swiggy Corporate Cafeteria Services"
        ],
        "items": [
            ("Client dinner & executive catering banquet event buffet 25 pax", "996331", 14200),
            ("Corporate annual team dinner & celebration party food package", "996331", 38500),
            ("Monthly executive cafeteria lunch meal passes & cafeteria catering", "996332", 45000),
            ("Client business lunch conference meals and high tea service", "996331", 8600),
            ("Freshly roasted coffee beans & pantry snack supply monthly billing", "996337", 12000),
            ("Team celebration party snacks, beverages, finger food & pastries", "996331", 6400),
            ("VIP delegate multi-course dinner dining and hospitality charges", "996331", 22500),
            ("Pantry tea, coffee vending machine refills & milk cartons", "996337", 9500)
        ]
    },
    "Professional & Legal Services": {
        "hsn": ["998211", "998221", "998231", "998311", "998214"],
        "vendors": [
            "Shardul Amarchand & Partners Advocates", "KPMG India Chartered Accountants",
            "Singhania & Co Legal Advisors", "BDO India Tax & Regulatory LLP",
            "Ernst & Young LLP Assurance Services", "PricewaterhouseCoopers (PwC) India",
            "Narayanan & Seshadri Company Secretaries", "VakilSearch Corporate Legal Services",
            "Grant Thornton Bharat LLP", "Anand & Anand Intellectual Property Law"
        ],
        "items": [
            ("Statutory audit fees, quarterly tax audit & GST annual return filing certification", "998221", 85000),
            ("Legal opinion on contractual liability, IP trademark filing & advocate fee", "998211", 55000),
            ("Transfer pricing documentation and corporate tax advisory retainer", "998231", 72000),
            ("Company secretarial compliance, ROC MCA filing & annual board resolution", "998214", 35000),
            ("Management consulting fee for operational process restructuring & ESG audit", "998311", 120000),
            ("Patent search, prior art assessment & provisional patent application filing", "998211", 48000),
            ("Labor law compliance audit, POSH policy formulation & retainer", "998211", 30000),
            ("Valuation advisory report for equity share issuance under FEMA/RBI norms", "998231", 95000)
        ]
    },
    "Utilities": {
        "hsn": ["996911", "996912", "996921", "998411", "996913"],
        "vendors": [
            "Tata Power Company Limited", "Bescom Bangalore Electricity Supply Co",
            "Mahanagar Gas Limited", "Airtel Enterprise Leased Line Broadband",
            "Reliance Jio Infocomm Fiber Services", "Adani Total Gas Limited",
            "Delhi Jal Board Commercial Water Supply", "Vodafone Idea Enterprise Connectivity",
            "Torrent Power Limited Commercial", "Maharashtra State Electricity Distribution (MSEDCL)"
        ],
        "items": [
            ("Commercial high tension electricity tariff consumption 8500 units billing", "996911", 62000),
            ("Enterprise dedicated leased line internet bandwidth 500Mbps symmetrical", "998411", 24500),
            ("Piped natural gas (PNG) commercial supply for cafeteria and boiler", "996921", 15800),
            ("Municipal commercial water tanker & wastewater pipeline utility cess", "996912", 8400),
            ("Primary fiber broadband connectivity & backup SIP trunk telephone line", "998411", 12500),
            ("Three-phase industrial electric power meter fixed capacity & fuel surcharge", "996911", 78000),
            ("Data center dark fiber point-to-point leased connectivity monthly tariff", "998411", 38000),
            ("Bulk commercial potable RO drinking water dispenser cans monthly supply", "996912", 4200)
        ]
    },
    "Rent & Facilities": {
        "hsn": ["997212", "997211", "997221", "997214"],
        "vendors": [
            "WeWork India Management Pvt Ltd", "DLF CyberCity Commercial Developers",
            "Prestige Estates Projects Ltd", "Indiabulls Real Estate Commercial Leasing",
            "Awfis Space Solutions Private Limited", "Embassy Office Parks REIT",
            "IndoSpace Industrial Warehouse Parks", "Brigade Enterprises Commercial Properties",
            "Smartworks Coworking Spaces Ltd", "K Raheja Corp Commercial Infrastructure"
        ],
        "items": [
            ("Commercial office premises monthly lease rent for 4th Floor Tech Park", "997212", 185000),
            ("Dedicated managed coworking space 30 desks monthly membership fee", "997212", 140000),
            ("Industrial logistics warehouse bay 5000 sq ft rental space lease", "997212", 95000),
            ("Common area maintenance (CAM) charges, central HVAC & security amenities", "997211", 34000),
            ("Commercial property parking slot rental charges 10 basement bays", "997214", 18000),
            ("Sub-lease office workstation plug and play facility rental agreement", "997212", 110000),
            ("Quarterly advance commercial estate space license fee Bangalore campus", "997212", 450000),
            ("Building maintenance charges, diesel backup power sharing & lobby services", "997211", 28000)
        ]
    },
    "Marketing & Advertising": {
        "hsn": ["998361", "998362", "998363", "998365", "998366"],
        "vendors": [
            "Google India Private Limited (Ads)", "Meta Platforms Advertising India",
            "Ogilvy & Mather Advertising Ltd", "Dentsu Aegis Network India",
            "LinkedIn Advertising Enterprise", "Times Internet Media & Ads",
            "BrightEdge Digital SEO & SEM Agency", "SocialBeat Digital Marketing LLP",
            "Prachar Outdoor Media & Billboards", "Madison World Media Communications"
        ],
        "items": [
            ("Google Ads PPC search campaigns, display network clicks & remarketing", "998361", 75000),
            ("Meta Facebook & Instagram sponsored video advertisements campaign", "998361", 62000),
            ("LinkedIn sponsored content lead generation campaign for B2B tech outreach", "998361", 45000),
            ("Creative brand design, TVC production & digital banner copywriting retainer", "998362", 110000),
            ("SEO search engine optimization monthly retainer & keyword link building", "998363", 38000),
            ("Outdoor hoarding billboard display near Airport Highway 30 days display", "998365", 130000),
            ("Influencer marketing partnership sponsorship & product video review campaign", "998366", 85000),
            ("Print media newspaper advertisement publication Quarter Page Economic Times", "998361", 95000)
        ]
    },
    "Office Supplies & Stationery": {
        "hsn": ["482010", "480256", "960810", "491110", "392610", "481910"],
        "vendors": [
            "Metro Print House", "Staples Office Supplies India", "Navneet Education Limited",
            "JK Paper Mills Stationery", "Kores India Office Products", "Camlin Kokuyo Stationery Ltd",
            "Neelgagan Paper & Forms", "Falcon Office Automation Stationery",
            "Printech Corporate Stationers", "Lotus Office Essentials Pvt Ltd",
            "SITHY VINAYAGAR TRADERS", "Sri Lakshmi Paper & Stationery Mart", "Balaji General Store"
        ],
        "items": [
            ("Branded brochures, visiting cards & packaging labels customized printing", "491110", 8500),
            ("JK Copier A4 Paper 75 GSM 50 Reams bulk box supply", "480256", 12500),
            ("Ballpoint pens, permanent markers, sticky notes & document binder clips", "960810", 3800),
            ("Executive spiral notebooks, desk organizers, staplers & punch machines", "482010", 5400),
            ("Laser printer toner cartridges HP 88A / Canon 337 6 units", "844399", 14500),
            ("Custom printed letterheads, corporate envelopes & ID card lanyards", "491110", 7200),
            ("Thermal paper rolls for billing POS machines 100 rolls box", "481190", 2900),
            ("Document filing folders, plastic poly pockets & box files 100 pcs", "392610", 4100),
            ("General stationery supplies, registers, ledger books & packaging tape", "4820", 4900)
        ]
    },
    "Insurance": {
        "hsn": ["997131", "997132", "997133", "997134"],
        "vendors": [
            "HDFC ERGO General Insurance Co Ltd", "ICICI Lombard General Insurance",
            "Tata AIG General Insurance Co Ltd", "Bajaj Allianz General Insurance",
            "Star Health and Allied Insurance", "New India Assurance Co Ltd",
            "Go Digit General Insurance Ltd", "Care Health Insurance Limited",
            "National Insurance Company Limited", "SBI General Insurance Co Ltd"
        ],
        "items": [
            ("Group Health Insurance policy premium for 50 employees annual cover", "997133", 240000),
            ("Commercial property, factory fire & special perils insurance policy premium", "997132", 65000),
            ("Directors and Officers (D&O) liability corporate indemnity insurance premium", "997134", 110000),
            ("Marine cargo transit open policy insurance for interstate dispatches", "997131", 32000),
            ("Cyber security risks, data breach and liability insurance cover policy", "997134", 85000),
            ("Keyman life insurance corporate policy annual premium endorsement", "997133", 95000),
            ("Commercial motor vehicles fleet comprehensive insurance premium 4 trucks", "997132", 48000),
            ("Workmen compensation insurance policy premium for factory workers", "997133", 36000)
        ]
    },
    "Travel & Conveyance": {
        "hsn": ["996411", "996412", "996423", "996416", "996311"],
        "vendors": [
            "MakeMyTrip Corporate Travel Solutions", "InterGlobe Aviation Ltd (IndiGo)",
            "Air India Corporate Booking Desk", "Uber Technologies B2B Business Travel",
            "Ola Cabs Corporate Rides", "Yatra Online Corporate Services",
            "Thomas Cook Corporate Travel Ltd", "Zoomcar Enterprise Fleet Rentals",
            "Ginger Hotels Corporate Stay", "Lemon Tree Hotels & Hospitality"
        ],
        "items": [
            ("Domestic flight tickets Mumbai to Bangalore return business trip 3 pax", "996411", 34500),
            ("Corporate Uber for Business monthly taxi cab rides employee travel", "996412", 18200),
            ("Business hotel accommodation 4 nights executive corporate room stay", "996311", 24000),
            ("Airport pickup and drop chauffeur driven luxury car rental service", "996416", 6500),
            ("Railway train AC 1st class confirmed tickets IRCTC group booking", "996411", 8900),
            ("International airline flight tickets Delhi to Singapore conference delegate", "996411", 78000),
            ("Self-drive rental vehicle 7 days for field sales survey operations", "996423", 14500),
            ("Corporate travel agency ticketing booking fee and visa processing fee", "996411", 4200)
        ]
    },
    "Repairs & Maintenance": {
        "hsn": ["998711", "998712", "998713", "998714", "998729"],
        "vendors": [
            "Voltas HVAC Repair & Annual Maintenance", "Urban Company Enterprise Facilities",
            "Blue Star Air Conditioning Maintenance", "Schindler Elevators Maintenance India",
            "Cummins Diesel Generator Service", "Eureka Forbes Commercial Water Purifier AMC",
            "Schneider Electric Infrastructure Support", "CleanWorks Industrial Sanitization & Pest Control",
            "Matrix Security Systems CCTV & Biometric Maintenance", "Godrej Pest Control Services"
        ],
        "items": [
            ("Annual Maintenance Contract (AMC) for central HVAC chillers quarterly service", "998711", 45000),
            ("Diesel generator overhaul, engine oil replacement, fuel filter service", "998712", 28000),
            ("Passenger passenger lift / elevator preventive monthly maintenance service", "998713", 22000),
            ("Fire fighting equipment refilling, smoke detector calibration & testing", "998714", 16500),
            ("Commercial RO drinking water plant filter replacement & membrane servicing AMC", "998729", 9500),
            ("Electrical wiring inspection, breaker panel replacement and UPS battery repair", "998712", 18400),
            ("Quarterly commercial pest control, termite treatment & fumigation service", "998729", 12000),
            ("CCTV camera surveillance cabling repair & biometric turnstile door lock fixing", "998714", 14800)
        ]
    },
    "Other": {
        "hsn": ["999999", "998399", "999799", "999119"],
        "vendors": [
            "Sundry Miscellaneous Suppliers", "Apex General Store", "National Welfare Association",
            "Swachh Bharat Municipal Cess Authority", "Standard Traders & Liquidators",
            "Vividh Enterprises", "Universal Clearing & Scrapping Agency",
            "General Merchants Cooperative Society"
        ],
        "items": [
            ("Miscellaneous unclaimed supplies, unlisted scrap disposal handling fee", "999999", 4500),
            ("Festival bonus gift voucher distribution handling admin fee", "999799", 12000),
            ("Donation to employee welfare fund and disaster rehabilitation cess", "999119", 15000),
            ("Annual club membership and recreation sports day event fee", "999799", 8500),
            ("Unclassified administrative charges and miscellaneous office expense", "998399", 6200),
            ("Exhibition stall security deposit forfeiture and incidental fee", "999999", 7500),
            ("Old scrap wooden pallets, broken crates & discarded material clearance", "999999", 3800),
            ("General municipal vendor registration renewal fee and stamp paper charges", "999119", 2500)
        ]
    }
}

STATES = [
    ("27", "Maharashtra"),
    ("07", "Delhi"),
    ("29", "Karnataka"),
    ("33", "Tamil Nadu"),
    ("24", "Gujarat"),
    ("36", "Telangana"),
    ("06", "Haryana"),
    ("19", "West Bengal")
]

def generate_gstin(state_code):
    pan_chars = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=5))
    pan_num = "".join(random.choices("0123456789", k=4))
    pan_check = random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    pan = f"{pan_chars}{pan_num}{pan_check}"
    entity_num = random.choice("1234")
    z = "Z"
    chk = random.choice("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    return f"{state_code}{pan}{entity_num}{z}{chk}"

def generate_invoice_text(category, index, profile):
    state_code, state_name = random.choice(STATES)
    vendor = random.choice(profile["vendors"])
    gstin = generate_gstin(state_code)
    
    # Pick 1-3 line items from category
    selected_items = random.sample(profile["items"], k=random.randint(1, min(3, len(profile["items"]))))
    
    inv_num_format = random.choice([
        f"INV-2026-{random.randint(1000, 9999)}",
        f"TAX/{random.randint(25, 26)}-{random.randint(26, 27)}/{random.randint(100, 999)}",
        f"BILL/{state_code}/{random.randint(10000, 99999)}",
        f"GST/{random.randint(1000, 9999)}/2026",
        f"{vendor[:3].upper()}-{random.randint(10000, 99999)}"
    ])
    
    day = random.randint(1, 28)
    month = random.choice(["04", "05", "06", "07", "08", "09", "10", "11", "12", "01", "02", "03"])
    year = "2026"
    date_str = f"{day:02d}/{month}/{year}"
    
    # Calculate amounts
    taxable_sum = 0
    items_text_list = []
    
    for item_desc, hsn, base_amount in selected_items:
        qty = random.randint(1, 10)
        unit_price = round(base_amount / max(1, qty * (1 if qty == 1 else random.uniform(0.7, 1.3))), 2)
        total_item_val = round(unit_price * qty, 2)
        taxable_sum += total_item_val
        items_text_list.append(f"  Item: {item_desc}\n  HSN/SAC: {hsn} | Qty: {qty} | Rate: INR {unit_price:,.2f} | Amount: INR {total_item_val:,.2f}")
    
    is_interstate = random.choice([True, False])
    gst_rate = random.choice([18, 18, 18, 12, 5, 28])
    gst_amt = round(taxable_sum * (gst_rate / 100.0), 2)
    grand_total = round(taxable_sum + gst_amt, 2)
    
    tax_breakdown = ""
    if is_interstate:
        tax_breakdown = f"IGST ({gst_rate}%): INR {gst_amt:,.2f}"
    else:
        half_rate = gst_rate / 2.0
        half_tax = round(gst_amt / 2.0, 2)
        tax_breakdown = f"CGST ({half_rate}%): INR {half_tax:,.2f}\nSGST ({half_rate}%): INR {half_tax:,.2f}"
    
    header_style = random.choice([
        "TAX INVOICE",
        "=== [PAGE 1 OF 1] ===\nTAX INVOICE Original for Recipient",
        "=== [PAGE 1 OF 2] ===\nTax Invoice",
        "ORIGINAL FOR RECIPIENT - TAX INVOICE",
        "GST TAX INVOICE",
        "COMMERCIAL TAX INVOICE",
        "Tax Invoice | Delivery Note | Dated",
        "TAX INVOICE (ORIGINAL FOR RECIPIENT)"
    ])
    
    # Introduce OCR variability and noise
    text = f"""{header_style}
Supplier / Vendor: {vendor}
Address: Industrial Area, {state_name}, India
GSTIN/UIN: {gstin} | PAN: {gstin[2:12]}
State Name / State Code: {state_name} ({state_code})

Invoice No: {inv_num_format} | Mode/Terms of Payment: 30 Days
Invoice Date / Dated: {date_str}
Reverse Charge (RCM): {'Yes' if category == 'Freight & Transport' and random.random() > 0.5 else 'No'}
Place of Supply: {state_name} ({state_code})

Billed To / Recipient / Name of the Customer:
BillWise Enterprises Private Limited
Address: Plot No 12, Industrial Estate, Mumbai, Maharashtra
GSTIN: 27AAACB1234F1Z5 | State: Maharashtra (27)

--------------------------------------------------
LINE ITEMS & PARTICULARS
--------------------------------------------------
""" + "\n".join(items_text_list) + f"""

--------------------------------------------------
Subtotal / Taxable Value: INR {taxable_sum:,.2f}
{tax_breakdown}
Total Tax Amount: INR {gst_amt:,.2f}
GRAND TOTAL (INCL. TAX): INR {grand_total:,.2f}
--------------------------------------------------
Payment Terms: Net 30 Days | Mode: NEFT/RTGS
Bank Name: HDFC Bank | A/C: 502000{random.randint(100000, 999999)} | IFSC: HDFC0001234
Authorized Signatory for {vendor}
=================================================="""

    # Occasionally lower/upper case certain keywords to test model robustness
    if random.random() < 0.15:
        text = text.lower()
        
    return {
        "text": text.strip(),
        "category": category,
        "vendor": vendor,
        "taxable": taxable_sum,
        "grand_total": grand_total
    }

def main():
    print("Generating comprehensive labeled dataset for BillWise Invoice Classifier...")
    
    target_samples_per_class = 120  # 15 classes * 120 = 1800 samples
    dataset = []
    
    for category in ALLOWED_CATEGORIES:
        profile = CATEGORY_PROFILES[category]
        print(f"  Generating {target_samples_per_class} examples for [{category}]...")
        for i in range(target_samples_per_class):
            example = generate_invoice_text(category, i, profile)
            dataset.append(example)
            
    # Shuffle dataset
    random.seed(42)
    random.shuffle(dataset)
    
    # Ensure directory exists
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    os.makedirs(data_dir, exist_ok=True)
    
    jsonl_path = os.path.join(data_dir, "invoice_categories.jsonl")
    csv_path = os.path.join(data_dir, "invoice_categories.csv")
    
    # Save to JSONL
    with open(jsonl_path, "w", encoding="utf-8") as f:
        for item in dataset:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
            
    # Save to CSV
    df = pd.DataFrame(dataset)
    df.to_csv(csv_path, index=False, encoding="utf-8")
    
    print(f"\n[OK] Successfully created {len(dataset)} labeled examples across {len(ALLOWED_CATEGORIES)} categories.")
    print(f"Saved to:\n  -> {jsonl_path}\n  -> {csv_path}")

if __name__ == "__main__":
    main()
