"""
Cost Analysis API - Phase 1
Simple implementation: Work Planning → MPE Production Data
"""

import frappe
from frappe import _
from frappe.utils import flt, today


@frappe.whitelist()
def get_production_data_phase1(filters=None):
    """
    Phase 1: Get production data based on Work Planning lots
    
    Flow:
    1. Get lot numbers from Work Planning + Add On Work Planning (by date range)
    2. Get MPE data for those lot numbers with Work Plan reference
    
    Args:
        filters (dict):
            - from_date: Start date (default: April 1, 2025)
            - to_date: End date (default: today)
            
    Returns:
        dict: Production data with lot numbers and quantities
    """
    
    if not filters:
        filters = {}
    
    # Default date range
    from_date = filters.get("from_date", "2025-04-01")
    to_date = filters.get("to_date", today())
    
    # Step 1: Get lot numbers from Work Planning with plan details
    work_planning_lots = get_work_planning_lots(from_date, to_date)
    
    if not work_planning_lots:
        return {
            "success": True,
            "from_date": from_date,
            "to_date": to_date,
            "message": "No Work Planning found for this date range",
            "production_data": []
        }
    
    # Step 2: Get MPE data for those lot numbers with work plan info
    production_data = get_mpe_for_lots(work_planning_lots)
    
    return {
        "success": True,
        "from_date": from_date,
        "to_date": to_date,
        "total_lots": len(work_planning_lots),
        "production_entries": len(production_data),
        "production_data": production_data
    }


def get_work_planning_lots(from_date, to_date):
    """
    Get lot numbers from Work Planning and Add On Work Planning
    """
    query = """
        SELECT DISTINCT 
            wpi.lot_number, 
            wp.name as work_plan,
            wp.date as planned_date, 
            wp.shift_type,
            'Work Planning' as source
        FROM `tabWork Planning` wp
        INNER JOIN `tabWork Plan Item` wpi ON wpi.parent = wp.name
        WHERE wp.date BETWEEN %s AND %s
        AND wp.docstatus = 1
        AND wpi.lot_number IS NOT NULL
        AND wpi.lot_number != ''
        
        UNION
        
        SELECT DISTINCT 
            awpi.lot_number, 
            awp.name as work_plan,
            awp.date as planned_date, 
            awp.shift_type,
            'Add On Work Planning' as source
        FROM `tabAdd On Work Planning` awp
        INNER JOIN `tabAdd On Work Plan Item` awpi ON awpi.parent = awp.name
        WHERE awp.date BETWEEN %s AND %s
        AND awp.docstatus = 1
        AND awpi.lot_number IS NOT NULL
        AND awpi.lot_number != ''
        
        ORDER BY planned_date DESC
    """
    
    return frappe.db.sql(query, (from_date, to_date, from_date, to_date), as_dict=True)


def get_mpe_for_lots(lot_list):
    """
    Get Moulding Production Entry data for specific lot numbers
    Merge with Work Plan information
    """
    # Create lookup dict for work plan info by lot number
    lot_plan_map = {lot['lot_number']: lot for lot in lot_list}
    
    # Extract just the lot numbers
    lot_numbers = [lot['lot_number'] for lot in lot_list]
    
    if not lot_numbers:
        return []
    
    # Build IN clause
    lot_numbers_str = "'" + "','".join(lot_numbers) + "'"
    
    query = f"""
        SELECT 
            mpe.name as mpe_name,
            mpe.scan_lot_number as lot_no,
            DATE(mpe.moulding_date) as moulding_date,
            mpe.item_to_produce as item_code,
            mpe.number_of_lifts as production_qty_nos,
            mpe.weight as weight_kg,
            mpe.no_of_running_cavities as cavities,
            (mpe.number_of_lifts * mpe.no_of_running_cavities) as total_pieces,
            mpe.employee_name as operator_name,
            jc.workstation as machine_name
        FROM `tabMoulding Production Entry` mpe
        LEFT JOIN `tabJob Card` jc ON mpe.job_card = jc.name
        WHERE mpe.scan_lot_number IN ({lot_numbers_str})
        AND mpe.docstatus = 1
        ORDER BY mpe.moulding_date DESC, mpe.scan_lot_number
    """
    
    mpe_data = frappe.db.sql(query, as_dict=True)
    
    # Merge work plan info with MPE data
    for row in mpe_data:
        lot_no = row['lot_no']
        if lot_no in lot_plan_map:
            row['work_plan'] = lot_plan_map[lot_no]['work_plan']
            row['planned_date'] = lot_plan_map[lot_no]['planned_date']
            row['plan_source'] = lot_plan_map[lot_no]['source']
        else:
            row['work_plan'] = None
            row['planned_date'] = None
            row['plan_source'] = None
    
    return mpe_data
