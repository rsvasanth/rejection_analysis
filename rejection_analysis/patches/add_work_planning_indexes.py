"""
Database Indexes for Work Planning Performance Optimization

This patch adds indexes to speed up Work Planning-based Lot Inspection queries.
Without these indexes, queries with 40-50 lot numbers are extremely slow.

Run this after deploying code changes.
"""

import frappe

def execute():
    """Add database indexes for Work Planning lot lookups"""
    
    # Check if we're on the correct site
    if not frappe.db:
        return
    
    try:
        # Index on Work Plan Item lot_number (for IN clause lookup)
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_lot_number 
            ON `tabWork Plan Item` (lot_number)
        """)
        
        # Index on Work Planning date (for WHERE date = filter)
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_date 
            ON `tabWork Planning` (date, docstatus)
        """)
        
        # Index on Addon Work Plan Item lot_number
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_lot_number 
            ON `tabAdd On Work Plan Item` (lot_number)
        """)
        
        # Index on Addon Work Planning date
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_date 
            ON `tabAdd On Work Planning` (date, docstatus)
        """)
        
        # Index on Inspection Entry lot_no (for IN clause lookup)
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_lot_no 
            ON `tabInspection Entry` (lot_no, inspection_type, docstatus)
        """)
        
        frappe.db.commit()
        
        print("✅ Database indexes created successfully")
        print("   - Work Plan Item: idx_lot_number")
        print("   - Work Planning: idx_date")
        print("   - Add On Work Plan Item: idx_lot_number")
        print("   - Add On Work Planning: idx_date")
        print("   - Inspection Entry: idx_lot_no")
        
    except Exception as e:
        print(f"❌ Error creating indexes: {str(e)}")
        frappe.log_error("Database Index Creation Failed", str(e))
