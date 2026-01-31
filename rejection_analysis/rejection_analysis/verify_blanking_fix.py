import frappe
import json
from rejection_analysis.rejection_analysis.rejection_analysis.api import get_traceable_sample_set

def verify_fix():
    print("Verifying Blanking Operator tracing fix for lot 25J08U06...")
    
    # We'll call the API directly for the specific date
    res = get_traceable_sample_set(limit=100, date="2025-10-08")
    
    target_lot = "25J08U06"
    found = False
    for row in res:
        if row.get("Lot No") == target_lot:
            found = True
            print(f"\nFound row for lot {target_lot}:")
            print(f"Date: {row['Date']}")
            print(f"Bin1: {row['Bin1']}")
            print(f"Blanking Op 1: {row['Blanking Operator 1']}")
            break
            
    if not found:
        print(f"\nLot {target_lot} not found in first 100 records of 2025-10-08")

if __name__ == "__main__":
    verify_fix()
