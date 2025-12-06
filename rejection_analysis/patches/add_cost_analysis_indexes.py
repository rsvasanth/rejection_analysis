"""
Database Indexes for Cost Analysis Performance

This patch adds indexes for Cost Analysis queries to improve performance.
"""

import frappe

def execute():
    """Add database indexes for Cost Analysis queries"""
    
    if not frappe.db:
        return
    
    try:
        # Index on Moulding Production Entry moulding_date
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_mpe_moulding_date 
            ON `tabMoulding Production Entry` (moulding_date, docstatus)
        """)
        
        # Index on Inspection Entry posting_date and inspection_type
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_ie_posting_date_type 
            ON `tabInspection Entry` (posting_date, inspection_type, docstatus)
        """)
        
        # Index on SPP Inspection Entry posting_date
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_spp_posting_date 
            ON `tabSpp Inspection Entry` (posting_date, inspection_type, docstatus)
        """)
        
        # Index on Inspection Entry Item for defect lookups
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_iei_parent_reason 
            ON `tabInspection Entry Item` (parent, rejection_reason)
        """)
        
        # Index on SPP Inspection Entry Item for defect lookups
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_sei_parent_reason 
            ON `tabSpp Inspection Entry Item` (parent, rejection_reason)
        """)
        
        frappe.db.commit()
        
        print("✅ Cost Analysis indexes created successfully")
        
    except Exception as e:
        print(f"❌ Error creating indexes: {str(e)}")
        frappe.log_error("Cost Analysis Index Creation Failed", str(e))
