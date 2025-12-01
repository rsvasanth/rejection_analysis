"""
Data Pattern Discovery Script for Rejection Analysis Charts
This script queries real data to find patterns and suggest meaningful charts
"""

import frappe
from frappe.utils import flt, getdate, add_days
from collections import defaultdict
import json

def analyze_data_patterns():
    """Analyze data from all three primary doctypes"""
    
    patterns = {
        "date_range": get_date_range(),
        "inspection_volume": get_inspection_volume(),
        "rejection_trends": get_rejection_trends(),
        "defect_distribution": get_defect_distribution(),
        "operator_performance": get_operator_performance(),
        "machine_performance": get_machine_performance(),
        "item_quality": get_item_quality_trends(),
        "shift_analysis": get_shift_analysis(),
        "batch_analysis": get_batch_analysis()
    }
    
    return patterns

def get_date_range():
    """Get the date range of available data"""
    mpe_dates = frappe.db.sql("""
        SELECT MIN(moulding_date) as min_date, MAX(moulding_date) as max_date
        FROM `tabMoulding Production Entry`
        WHERE docstatus = 1
    """, as_dict=True)
    
    ie_dates = frappe.db.sql("""
        SELECT MIN(posting_date) as min_date, MAX(posting_date) as max_date
        FROM `tabInspection Entry`
        WHERE docstatus = 1
    """, as_dict=True)
    
    return {
        "moulding_production": mpe_dates[0] if mpe_dates else None,
        "inspections": ie_dates[0] if ie_dates else None
    }

def get_inspection_volume():
    """Get inspection volume by type"""
    data = frappe.db.sql("""
        SELECT 
            inspection_type,
            COUNT(*) as count,
            COUNT(DISTINCT lot_no) as unique_lots,
            AVG(total_rejected_qty_in_percentage) as avg_rejection
        FROM `tabInspection Entry`
        WHERE docstatus = 1
        GROUP BY inspection_type
    """, as_dict=True)
    
    # Also get SPP inspection data
    spp_data = frappe.db.sql("""
        SELECT 
            'Final Visual Inspection' as inspection_type,
            COUNT(*) as count,
            COUNT(DISTINCT lot_no) as unique_lots,
            AVG(total_rejected_qty_in_percentage) as avg_rejection
        FROM `tabSPP Inspection Entry`
        WHERE docstatus = 1 AND inspection_type = 'Final Visual Inspection'
    """, as_dict=True)
    
    return {
        "inspection_entry": data,
        "spp_inspection": spp_data
    }

def get_rejection_trends():
    """Get rejection trends over time (last 30 days)"""
    data = frappe.db.sql("""
        SELECT 
            DATE_FORMAT(mpe.moulding_date, '%%Y-%%m-%%d') as date,
            ie.inspection_type,
            COUNT(*) as inspection_count,
            AVG(ie.total_rejected_qty_in_percentage) as avg_rejection_pct,
            SUM(ie.total_rejected_qty) as total_rejected_qty
        FROM `tabInspection Entry` ie
        LEFT JOIN `tabMoulding Production Entry` mpe
            ON mpe.scan_lot_number = ie.lot_no
        WHERE ie.docstatus = 1
        AND mpe.moulding_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE_FORMAT(mpe.moulding_date, '%%Y-%%m-%%d'), ie.inspection_type
        ORDER BY mpe.moulding_date DESC
    """, as_dict=True)
    
    return data

def get_defect_distribution():
    """Get distribution of defect types"""
    # From Inspection Entry Items
    ie_defects = frappe.db.sql("""
        SELECT 
            type_of_defect,
            COUNT(*) as occurrence_count,
            SUM(rejected_qty) as total_rejected_qty
        FROM `tabInspection Entry Item`
        WHERE parent IN (
            SELECT name FROM `tabInspection Entry` WHERE docstatus = 1
        )
        AND type_of_defect IS NOT NULL
        AND type_of_defect != ''
        GROUP BY type_of_defect
        ORDER BY occurrence_count DESC
        LIMIT 10
    """, as_dict=True)
    
    # From SPP Inspection Entry Items
    spp_defects = frappe.db.sql("""
        SELECT 
            type_of_defect,
            COUNT(*) as occurrence_count,
            SUM(rejected_qty) as total_rejected_qty
        FROM `tabFV Inspection Entry Item`
        WHERE parent IN (
            SELECT name FROM `tabSPP Inspection Entry` WHERE docstatus = 1
        )
        AND type_of_defect IS NOT NULL
        AND type_of_defect != ''
        GROUP BY type_of_defect
        ORDER BY occurrence_count DESC
        LIMIT 10
    """, as_dict=True)
    
    return {
        "inspection_entry_defects": ie_defects,
        "spp_defects": spp_defects
    }

def get_operator_performance():
    """Get operator performance metrics"""
    data = frappe.db.sql("""
        SELECT 
            mpe.employee_name as operator_name,
            COUNT(DISTINCT ie.name) as inspection_count,
            AVG(ie.total_rejected_qty_in_percentage) as avg_rejection_pct,
            COUNT(CASE WHEN ie.total_rejected_qty_in_percentage > 5.0 THEN 1 END) as critical_count
        FROM `tabMoulding Production Entry` mpe
        LEFT JOIN `tabInspection Entry` ie
            ON ie.lot_no = mpe.scan_lot_number
            AND ie.inspection_type = 'Lot Inspection'
            AND ie.docstatus = 1
        WHERE mpe.docstatus = 1
        AND mpe.employee_name IS NOT NULL
        AND ie.name IS NOT NULL
        GROUP BY mpe.employee_name
        HAVING inspection_count > 5
        ORDER BY avg_rejection_pct DESC
        LIMIT 15
    """, as_dict=True)
    
    return data

def get_machine_performance():
    """Get machine/press performance"""
    data = frappe.db.sql("""
        SELECT 
            ie.machine_no,
            COUNT(*) as inspection_count,
            AVG(ie.total_rejected_qty_in_percentage) as avg_rejection_pct,
            COUNT(CASE WHEN ie.total_rejected_qty_in_percentage > 5.0 THEN 1 END) as critical_count
        FROM `tabInspection Entry` ie
        WHERE ie.docstatus = 1
        AND ie.inspection_type IN ('Lot Inspection', 'Patrol Inspection', 'Line Inspection')
        AND ie.machine_no IS NOT NULL
        GROUP BY ie.machine_no
        HAVING inspection_count > 5
        ORDER BY avg_rejection_pct DESC
        LIMIT 15
    """, as_dict=True)
    
    return data

def get_item_quality_trends():
    """Get quality trends by item/product"""
    data = frappe.db.sql("""
        SELECT 
            mpe.item_to_produce as item,
            COUNT(DISTINCT ie.name) as inspection_count,
            AVG(ie.total_rejected_qty_in_percentage) as avg_rejection_pct,
            SUM(ie.total_rejected_qty) as total_rejected_qty
        FROM `tabMoulding Production Entry` mpe
        LEFT JOIN `tabInspection Entry` ie
            ON ie.lot_no = mpe.scan_lot_number
            AND ie.docstatus = 1
        WHERE mpe.docstatus = 1
        AND ie.name IS NOT NULL
        GROUP BY mpe.item_to_produce
        HAVING inspection_count > 5
        ORDER BY avg_rejection_pct DESC
        LIMIT 15
    """, as_dict=True)
    
    return data

def get_shift_analysis():
    """Analyze quality by shift"""
    data = frappe.db.sql("""
        SELECT 
            jc.shift_type,
            COUNT(DISTINCT ie.name) as inspection_count,
            AVG(ie.total_rejected_qty_in_percentage) as avg_rejection_pct,
            COUNT(CASE WHEN ie.total_rejected_qty_in_percentage > 5.0 THEN 1 END) as critical_count
        FROM `tabMoulding Production Entry` mpe
        LEFT JOIN `tabJob Card` jc ON jc.name = mpe.job_card
        LEFT JOIN `tabInspection Entry` ie
            ON ie.lot_no = mpe.scan_lot_number
            AND ie.inspection_type = 'Lot Inspection'
            AND ie.docstatus = 1
        WHERE mpe.docstatus = 1
        AND jc.shift_type IS NOT NULL
        AND ie.name IS NOT NULL
        GROUP BY jc.shift_type
    """, as_dict=True)
    
    return data

def get_batch_analysis():
    """Analyze batch quality"""
    data = frappe.db.sql("""
        SELECT 
            mpe.batch_no,
            mpe.item_to_produce as item,
            COUNT(DISTINCT ie.name) as inspection_count,
            AVG(ie.total_rejected_qty_in_percentage) as avg_rejection_pct
        FROM `tabMoulding Production Entry` mpe
        LEFT JOIN `tabInspection Entry` ie
            ON ie.lot_no = mpe.scan_lot_number
            AND ie.docstatus = 1
        WHERE mpe.docstatus = 1
        AND mpe.batch_no IS NOT NULL
        AND ie.name IS NOT NULL
        GROUP BY mpe.batch_no, mpe.item_to_produce
        HAVING inspection_count > 3
        ORDER BY avg_rejection_pct DESC
        LIMIT 20
    """, as_dict=True)
    
    return data

# Run the analysis
if __name__ == "__main__":
    patterns = analyze_data_patterns()
    print(json.dumps(patterns, indent=2, default=str))
