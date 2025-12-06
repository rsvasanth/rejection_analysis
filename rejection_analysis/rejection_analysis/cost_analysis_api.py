"""
Cost Analysis API - Phase 1
With item rates and production value calculation
"""

import frappe
from frappe import _
from frappe.utils import flt, today, add_days, add_months, getdate


@frappe.whitelist()
def get_production_data_phase1(filters=None):
    """
    Phase 1: Get production data based on Work Planning lots
    
    Flow:
    1. Calculate date range based on period
    2. Get lot numbers from Work Planning + Add On Work Planning
    3. Get MPE data for those lot numbers with item rates
    4. Calculate Production Value = Qty × Rate
    
    Args:
        filters (dict):
            - period: 'daily', 'weekly', 'monthly', '6months'
            - date: Selected date (for daily/weekly/monthly)
            
    Returns:
        dict: Production data with values
    """
    
    if not filters:
        filters = {}
    
    # Calculate date range based on period
    period = filters.get("period", "daily")
    selected_date = getdate(filters.get("date", today()))
    
    from_date, to_date = get_date_range(period, selected_date)
    
    # Get lot numbers from Work Planning
    work_planning_lots = get_work_planning_lots(from_date, to_date)
    
    if not work_planning_lots:
        return {
            "success": True,
            "period": period,
            "from_date": str(from_date),
            "to_date": str(to_date),
            "message": "No Work Planning found for this period",
            "production_data": [],
            "summary": {
                "total_lots": 0,
                "total_qty": 0,
                "total_value": 0
            }
        }
    
    # Get MPE data with rates
    production_data = get_mpe_with_rates(work_planning_lots)
    
    # Calculate summary
    total_qty = sum([flt(row.get('production_qty_nos', 0)) for row in production_data])
    total_value = sum([flt(row.get('production_value', 0)) for row in production_data])
    
    return {
        "success": True,
        "period": period,
        "from_date": str(from_date),
        "to_date": str(to_date),
        "total_lots": len(work_planning_lots),
        "production_entries": len(production_data),
        "production_data": production_data,
        "summary": {
            "total_lots": len(set([row['lot_no'] for row in production_data])),
            "total_qty": total_qty,
            "total_value": total_value
        }
    }


def get_date_range(period, selected_date):
    """Calculate from_date and to_date based on period"""
    
    if period == "daily":
        return selected_date, selected_date
    
    elif period == "weekly":
        # Last 7 days from selected date
        from_date = add_days(selected_date, -6)
        return from_date, selected_date
    
    elif period == "monthly":
        # Current month of selected date
        from_date = selected_date.replace(day=1)
        return from_date, selected_date
    
    elif period == "6months":
        # Last 6 months
        from_date = add_months(selected_date, -6)
        return from_date, selected_date
    
    else:
        # Default to daily
        return selected_date, selected_date


def get_work_planning_lots(from_date, to_date):
    """Get lot numbers from Work Planning and Add On Work Planning"""
    
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


def get_mpe_with_rates(lot_list):
    """
    Get MPE data with item rates
    Calculate Production Value = Qty × Rate
    """
    # Create lookup dict
    lot_plan_map = {lot['lot_number']: lot for lot in lot_list}
    
    # Extract lot numbers
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
            jc.workstation as machine_name,
            item.standard_rate as item_rate
        FROM `tabMoulding Production Entry` mpe
        LEFT JOIN `tabJob Card` jc ON mpe.job_card = jc.name
        LEFT JOIN `tabItem` item ON mpe.item_to_produce = item.name
        WHERE mpe.scan_lot_number IN ({lot_numbers_str})
        AND mpe.docstatus = 1
        ORDER BY mpe.moulding_date DESC, mpe.scan_lot_number
    """
    
    mpe_data = frappe.db.sql(query, as_dict=True)
    
    # Merge work plan info and calculate production value
    for row in mpe_data:
        lot_no = row['lot_no']
        
        # Add work plan info
        if lot_no in lot_plan_map:
            row['work_plan'] = lot_plan_map[lot_no]['work_plan']
            row['planned_date'] = lot_plan_map[lot_no]['planned_date']
            row['plan_source'] = lot_plan_map[lot_no]['source']
        else:
            row['work_plan'] = None
            row['planned_date'] = None
            row['plan_source'] = None
        
        # Calculate Production Value = Qty × Rate
        qty = flt(row.get('production_qty_nos', 0))
        rate = flt(row.get('item_rate', 0))
        row['production_value'] = qty * rate
    
    return mpe_data
