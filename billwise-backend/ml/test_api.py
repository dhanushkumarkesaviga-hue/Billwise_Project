import urllib.request
import json

test_cases = [
    {
        "name": "Cloud Infrastructure",
        "text": "TAX INVOICE Amazon Web Services India Monthly EC2 compute clusters RDS PostgreSQL and S3 storage SAC 998313 Amount INR 45000 IGST 8100",
        "vendorNameHint": "AWS Cloud"
    },
    {
        "name": "Freight & Transport",
        "text": "National Logistics & Freight Solutions Goods transport agency charges for North Zone delivery full truck load SAC 996511 Amount 28500",
        "vendorNameHint": "National Logistics"
    },
    {
        "name": "Food & Entertainment",
        "text": "Grand Palace Hotel & Catering Client dinner & executive catering banquet event buffet 25 pax SAC 996331 Total 14200",
        "vendorNameHint": "Grand Palace Hotel"
    },
    {
        "name": "Raw Materials",
        "text": "Mahavir Industrial Hardware & Tools Stainless steel fasteners M8 & industrial hardware batch HSN 731815 Taxable 84000",
        "vendorNameHint": "Mahavir Industrial"
    },
    {
        "name": "Software & Subscriptions",
        "text": "Jira Software Premium & Confluence Cloud Annual Subscription 50 seats Atlassian SAC 998315 Amount 145000",
        "vendorNameHint": "Atlassian"
    },
    {
        "name": "Insurance",
        "text": "HDFC ERGO General Insurance Co Group Health Insurance policy premium for 50 employees annual cover SAC 997133 Total 240000",
        "vendorNameHint": "HDFC ERGO"
    }
]

print(f"{'TEST CASE':<30} | {'PREDICTED CATEGORY':<30} | {'CONFIDENCE':<10} | {'STATUS'}")
print("-" * 85)

for tc in test_cases:
    req = urllib.request.Request(
        "http://localhost:8000/classify",
        data=json.dumps({"text": tc["text"], "vendorNameHint": tc["vendorNameHint"]}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        cat = res.get("category")
        conf = res.get("confidence")
        status = "PASS" if cat == tc["name"] else "FAIL"
        print(f"{tc['name']:<30} | {cat:<30} | {conf:<10} | {status}")
