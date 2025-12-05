#!/usr/bin/env python3
"""
Backfill rejection costs for all Daily Rejection Reports.
Run with: bench --site spp15.local execute rejection_analysis.scripts.backfill_costs.backfill_all_costs
"""

import frappe
from frappe.utils import flt

def backfill_all_costs():
    """Update all Daily Rejection Reports with cost data"""
    
    # Get all Daily Rejection Reports
    reports = frappe.get_all("Daily Rejection Report", 
        fields=["name", "report_date"],
        order_by="report_date desc"
    )
    
    print(f"Found {len(reports)} Daily Rejection Reports to update")
    
    updated = 0
    errors = 0
    
    for report_info in reports:
        try:
            # Load the document
            doc = frappe.get_doc("Daily Rejection Report", report_info.name)
            
            # Check if costs already calculated (skip if yes)
            has_costs = False
            if doc.incoming_inspection_items:
                has_costs = any(flt(item.rejection_cost) > 0 for item in doc.incoming_inspection_items)
            
            if has_costs:
                print(f"  ✓ {report_info.name} already has costs, skipping")
                continue
            
            # Calculate costs
            doc.calculate_rejection_costs()
            
            # Save without validation (to avoid date issues)
            doc.flags.ignore_validate = True
            doc.save()
            
            updated += 1
            print(f"  ✅ Updated {report_info.name} ({report_info.report_date})")
            
        except Exception as e:
            errors += 1
            print(f"  ❌ Error updating {report_info.name}: {str(e)}")
    
    # Commit all changes
    frappe.db.commit()
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Total Reports: {len(reports)}")
    print(f"  Updated: {updated}")
    print(f"  Errors: {errors}")
    print(f"  Skipped: {len(reports) - updated - errors}")
    print(f"{'='*60}")
    
    return {
        "total": len(reports),
        "updated": updated,
        "errors": errors
    }

if __name__ == "__main__":
    backfill_all_costs()
