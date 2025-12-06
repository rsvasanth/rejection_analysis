"""
Cost Analysis API
Tracks costs across 4 inspection stages:
1. Moulding (Production)
2. Lot Rejection
3. Incoming Inspection (DF Vendor - Cutmark, RBS, Impression)
4. Final Inspection (FVI - Over Trim, Under Fill)
"""

import frappe
from frappe import _
from frappe.utils import flt, today


@frappe.whitelist()
def get_cost_analysis_data(filters=None):
    """
    Main API endpoint for Cost Analysis
    
    Args:
        filters (dict):
            - from_date: Start date (default: April 1, 2025)
            - to_date: End date (default: today)
            
    Returns:
        dict: Cost analysis data by stage
    """
    
    if not filters:
        filters = {}
    
    # Default date range: April 1, 2025 to today
    from_date = filters.get("from_date", "2025-04-01")
    to_date = filters.get("to_date", today())
    
    # Stage 1: Moulding Production
    moulding_data = get_moulding_production(from_date, to_date)
    
    # Stage 2: Lot Rejection
    lot_rejection_data = get_lot_rejection(from_date, to_date)
    
    # Stage 3: Incoming Inspection (DF Vendor with specific defects)
    incoming_data = get_incoming_inspection_with_defects(from_date, to_date)
    
    # Stage 4: Final Inspection (FVI with Over Trim, Under Fill)
    fvi_data = get_fvi_inspection_with_defects(from_date, to_date)
    
    result = {
        "success": True,
        "from_date": from_date,
        "to_date": to_date,
        "stages": {
            "moulding": moulding_data,
            "lot_rejection": lot_rejection_data,
            "incoming_inspection": incoming_data,
            "final_inspection": fvi_data
        }
    }
    
    return result


def get_moulding_production(from_date, to_date):
    """
    Stage 1: Moulding Production Quantities
    """
    query = """
        SELECT 
            DATE(mpe.moulding_date) as date,
            mpe.item_to_produce as item_code,
            SUM(mpe.number_of_lifts) as production_qty_nos,
            COUNT(DISTINCT mpe.scan_lot_number) as total_lots,
            SUM(mpe.weight) as total_weight_kg
        FROM `tabMoulding Production Entry` mpe
        WHERE mpe.docstatus = 1
        AND DATE(mpe.moulding_date) BETWEEN %s AND %s
        GROUP BY DATE(mpe.moulding_date), mpe.item_to_produce
        ORDER BY DATE(mpe.moulding_date) DESC
    """
    
    return frappe.db.sql(query, (from_date, to_date), as_dict=True)


def get_lot_rejection(from_date, to_date):
    """
    Stage 2: Lot Rejection (Overall rejection %)
    """
    query = """
        SELECT 
            ie.posting_date as date,
            ie.product_ref_no as item_code,
            ie.lot_no,
            ie.inspected_qty_nos as inspected_qty,
            ie.total_rejected_qty as rejected_qty,
            ie.total_rejected_qty_in_percentage as rejection_pct
        FROM `tabInspection Entry` ie
        WHERE ie.inspection_type = 'Lot Inspection'
        AND ie.docstatus = 1
        AND ie.posting_date BETWEEN %s AND %s
        ORDER BY ie.posting_date DESC
    """
    
    return frappe.db.sql(query, (from_date, to_date), as_dict=True)


def get_incoming_inspection_with_defects(from_date, to_date):
    """
    Stage 3: Incoming Inspection (DF Vendor)
    Tracks specific defects: Cutmark, RBS Rejection, IMPRESSION MARK
    """
    query = """
        SELECT 
            ie.posting_date as date,
            ie.product_ref_no as item_code,
            ie.lot_no,
            ie.inspected_qty_nos as inspected_qty,
            ie.total_rejected_qty as total_rejected_qty,
            ie.total_rejected_qty_in_percentage as rejection_pct,
            ie.supplier,
            (SELECT SUM(iei.rejected_qty) 
             FROM `tabInspection Entry Item` iei 
             WHERE iei.parent = ie.name 
             AND iei.rejection_reason IN ('Cutmark', 'CUTMARK', 'Cut Mark')
            ) as cutmark_qty,
            (SELECT SUM(iei.rejected_qty) 
             FROM `tabInspection Entry Item` iei 
             WHERE iei.parent = ie.name 
             AND iei.rejection_reason IN ('RBS Rejection', 'RBS', 'Rbs Rejection')
            ) as rbs_rejection_qty,
            (SELECT SUM(iei.rejected_qty) 
             FROM `tabInspection Entry Item` iei 
             WHERE iei.parent = ie.name 
             AND iei.rejection_reason IN ('IMPRESSION MARK', 'Impression Mark')
            ) as impression_mark_qty
        FROM `tabInspection Entry` ie
        WHERE ie.inspection_type = 'Incoming Inspection'
        AND ie.docstatus = 1
        AND ie.posting_date BETWEEN %s AND %s
        ORDER BY ie.posting_date DESC
    """
    
    return frappe.db.sql(query, (from_date, to_date), as_dict=True)


def get_fvi_inspection_with_defects(from_date, to_date):
    """
    Stage 4: Final Inspection (FVI)
    Tracks defects: Over Trim, Under Fill (UF)
    Also tracks Trimming Rejection %
    """
    query = """
        SELECT 
            se.posting_date as date,
            se.item_code,
            se.lot_no,
            se.inspected_qty,
            se.rejected_qty as total_rejected_qty,
            se.rejection_percentage,
            (SELECT SUM(sei.rejected_qty)
             FROM `tabSpp Inspection Entry Item` sei
             WHERE sei.parent = se.name
             AND sei.rejection_reason IN ('Over Trim', 'OVER TRIM', 'Overtrim')
            ) as over_trim_qty,
            (SELECT SUM(sei.rejected_qty)
             FROM `tabSpp Inspection Entry Item` sei
             WHERE sei.parent = se.name
             AND sei.rejection_reason IN ('Under Fill', 'UNDER FILL', 'UF')
            ) as under_fill_qty,
            se.trimming_rejection_pct
        FROM `tabSpp Inspection Entry` se
        WHERE se.inspection_type = 'FVI'
        AND se.docstatus = 1
        AND se.posting_date BETWEEN %s AND %s
        ORDER BY se.posting_date DESC
    """
    
    return frappe.db.sql(query, (from_date, to_date), as_dict=True)
