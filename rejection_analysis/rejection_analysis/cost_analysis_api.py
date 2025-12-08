"""
Cost Analysis API - Complete Implementation
All 4 stages: Moulding, Lot Rejection, Incoming Inspection, FVI
"""

import frappe
from frappe import _
from frappe.utils import flt, today, add_days, add_months, getdate


@frappe.whitelist()
def get_cost_analysis_data(filters=None):
    """
    Complete Cost Analysis - All 4 Stages
    
    Stages:
    1. Moulding Production
    2. Lot Rejection
    3. Incoming Inspection (with Cutmark, RBS, Impression breakdown)
    4. Final Inspection (with Over Trim, Under Fill, Trimming rejection)
    
    Args:
        filters (dict):
            - period: 'daily', 'weekly', 'monthly', '6months'
            - date: Selected date
            
    Returns:
        dict: Complete cost analysis data for all stages
    """
    
    if not filters:
        filters = {}
    
    # Calculate date range
    period = filters.get("period", "daily")
    selected_date = getdate(filters.get("date", today()))
    from_date, to_date = get_date_range(period, selected_date)
    
    # Get lot numbers from Work Planning
    work_planning_lots = get_work_planning_lots(from_date, to_date)
    lot_numbers = [lot['lot_number'] for lot in work_planning_lots]
    
    if not lot_numbers:
        return {
            "success": True,
            "period": period,
            "from_date": str(from_date),
            "to_date": str(to_date),
            "message": "No Work Planning found for this period",
            "stages": {
                "moulding":[], 
                "lot_rejection": [],
                "incoming": [],
                "fvi": []
            },
            "summary": get_empty_summary()
        }
    
    # Fetch all stages
    moulding_data = get_moulding_data(lot_numbers, work_planning_lots)
    lot_rejection_data = get_lot_rejection_data(lot_numbers)
    incoming_data = get_incoming_inspection_data(lot_numbers)
    fvi_data = get_fvi_data(lot_numbers)
    
   # Calculate summary
    summary = calculate_summary(moulding_data, lot_rejection_data, incoming_data, fvi_data)
    
    return {
        "success": True,
        "period": period,
        "from_date": str(from_date),
        "to_date": str(to_date),
        "stages":{
            "moulding": moulding_data,
            "lot_rejection": lot_rejection_data,
            "incoming": incoming_data,
            "fvi": fvi_data
        },
        "summary": summary
    }


@frappe.whitelist()
def get_production_data_phase1(filters=None):
    """
    Phase 1: Get production data based on Work Planning lots
    (Backwards compatible endpoint)
    """
    
    if not filters:
        filters = {}
    
    period = filters.get("period", "daily")
    selected_date = getdate(filters.get("date", today()))
    from_date, to_date = get_date_range(period, selected_date)
    
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
    
    production_data = get_mpe_with_rates(work_planning_lots)
    
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
        from_date = add_days(selected_date, -6)
        return from_date, selected_date
    elif period == "monthly":
        from_date = selected_date.replace(day=1)
        return from_date, selected_date
    elif period == "6months":
        from_date = add_months(selected_date, -6)
        return from_date, selected_date
    else:
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


def get_moulding_data(lot_numbers, work_planning_lots):
    """Stage 1: Get Moulding Production Entry data with rates"""
    
    if not lot_numbers:
        return []
    
    lot_plan_map = {lot['lot_number']: lot for lot in work_planning_lots}
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
        
        # Calculate Production Value = Qty × Rate
        qty = flt(row.get('production_qty_nos', 0))
        rate = flt(row.get('item_rate', 0))
        row['production_value'] = qty * rate
    
    return mpe_data


def get_lot_rejection_data(lot_numbers):
    """Stage 2: Get Lot Inspection rejection data"""
    
    if not lot_numbers:
        return []
    
    lot_numbers_str = "'" + "','".join(lot_numbers) + "'"
    
    query = f"""
        SELECT 
            ie.name as inspection_entry,
            DATE(ie.posting_date) as inspection_date,
            ie.lot_no,
            ie.product_ref_no as item_code,
            ie.inspected_qty_nos,
            ie.total_rejected_qty,
            ie.total_rejected_qty_in_percentage as rejection_pct,
            ie.total_rejected_qty_kg as rejected_weight_kg,
            item.standard_rate as item_rate
        FROM `tabInspection Entry` ie
        LEFT JOIN `tabItem` item ON ie.product_ref_no = item.name
        WHERE ie.lot_no IN ({lot_numbers_str})
        AND ie.inspection_type = 'Lot Inspection'
        AND ie.docstatus = 1
        ORDER BY ie.posting_date DESC, ie.lot_no
    """
    
    lot_data = frappe.db.sql(query, as_dict=True)
    
    for row in lot_data:
        # Calculate Lot Rejection Cost
        rejected_qty = flt(row.get('total_rejected_qty', 0))
        rate = flt(row.get('item_rate', 0))
        row['rejection_cost'] = rejected_qty * rate
    
    return lot_data


def get_incoming_inspection_data(lot_numbers):
    """Stage 3: Get Incoming Inspection data with defect breakdown"""
    
    if not lot_numbers:
        return []
    
    lot_numbers_str = "'" + "','".join(lot_numbers) + "'"
    
    # Main query for incoming inspection
    query = f"""
        SELECT 
            ie.name as inspection_entry,
            DATE(ie.posting_date) as inspection_date,
            ie.lot_no,
            ie.product_ref_no as item_code,
            ie.inspected_qty_nos,
            ie.total_rejected_qty,
            ie.total_rejected_qty_in_percentage as rejection_pct,
            item.standard_rate as item_rate
        FROM `tabInspection Entry` ie
        LEFT JOIN `tabItem` item ON ie.product_ref_no = item.name
        WHERE ie.lot_no IN ({lot_numbers_str})
        AND ie.inspection_type = 'Incoming Inspection'
        AND ie.docstatus = 1
        ORDER BY ie.posting_date DESC, ie.lot_no
    """
    
    incoming_data = frappe.db.sql(query, as_dict=True)
    
    # Get defect details for each record
    for row in incoming_data:
        defects = get_incoming_defects(row['inspection_entry'])
        row['cutmark_qty'] = defects.get('cutmark', 0)
        row['rbs_rejection_qty'] = defects.get('rbs', 0)
        row['impression_mark_qty'] = defects.get('impression', 0)
        
        # Calculate C/M/RR % = (Cutmark + RBS) / 200
        cmrr_pct = (row['cutmark_qty'] + row['rbs_rejection_qty']) / 200.0
        row['cmrr_pct'] = cmrr_pct
        
        # Calculate DF Vendor Cost = Production Qty × C/M/RR % × Rate
        # Note: Using inspected_qty as proxy for production qty
        inspected_qty = flt(row.get('inspected_qty_nos', 0))
        rate = flt(row.get('item_rate', 0))
        row['df_vendor_cost'] = inspected_qty * cmrr_pct * rate
        
        # Also calculate total rejection cost
        rejected_qty = flt(row.get('total_rejected_qty', 0))
        row['total_rejection_cost'] = rejected_qty * rate
    
    return incoming_data


def get_incoming_defects(inspection_entry):
    """Get defect breakdown for incoming inspection"""
    
    query = """
        SELECT 
            rejection_reason,
            SUM(rejected_qty) as qty
        FROM `tabInspection Entry Item`
        WHERE parent = %s
        AND rejection_reason IN ('Cutmark', 'RBS Rejection', 'IMPRESSION MARK')
        GROUP BY rejection_reason
    """
    
    defects_data = frappe.db.sql(query, (inspection_entry,), as_dict=True)
    
    defects = {}
    for row in defects_data:
        reason = row['rejection_reason']
        if reason == 'Cutmark':
            defects['cutmark'] = flt(row['qty'], 2)
        elif reason == 'RBS Rejection':
            defects['rbs'] = flt(row['qty'], 2)
        elif reason == 'IMPRESSION MARK':
            defects['impression'] = flt(row['qty'], 2)
    
    return defects


def get_fvi_data(lot_numbers):
    """Stage 4: Get Final Inspection (FVI) data with defect breakdown"""
    
    if not lot_numbers:
        return []
    
    lot_numbers_str = "'" + "','".join(lot_numbers) + "'"
    
    query = f"""
        SELECT 
            sie.name as inspection_entry,
            DATE(sie.posting_date) as inspection_date,
            sie.lot_no,
            sie.item as item_code,
            sie.qty_to_inspect as inspected_qty,
            sie.total_rejected_qty as rejected_qty,
            sie.final_inspection_rejection_perc as rejection_pct,
            sie.trimming_rejection_pct,
            item.standard_rate as item_rate
        FROM `tabSpp Inspection Entry` sie
        LEFT JOIN `tabItem` item ON sie.item = item.name
        WHERE sie.lot_no IN ({lot_numbers_str})
        AND sie.inspection_type = 'FVI'
        AND sie.docstatus = 1
        ORDER BY sie.posting_date DESC, sie.lot_no
    """
    
    fvi_data = frappe.db.sql(query, as_dict=True)
    
    # Get defect details
    for row in fvi_data:
        defects = get_fvi_defects(row['inspection_entry'])
        row['over_trim_qty'] = defects.get('over_trim', 0)
        row['under_fill_qty'] = defects.get('under_fill', 0)
        
        # Calculate costs
        inspected_qty = flt(row.get('inspected_qty', 0))
        rate = flt(row.get('item_rate', 0))
        
        # Trimming Rejection Cost = Qty × Trim Rejection % × Rate
        trim_pct = flt(row.get('trimming_rejection_pct', 0)) / 100.0
        row['trimming_cost'] = inspected_qty * trim_pct * rate
        
        # Final Rejection Cost = Rejected Qty × Rate
        rejected_qty = flt(row.get('rejected_qty', 0))
        row['fvi_rejection_cost'] = rejected_qty * rate
        
        # Total FVI Cost
        row['total_fvi_cost'] = row['trimming_cost'] + row['fvi_rejection_cost']
    
    return fvi_data


def get_fvi_defects(inspection_entry):
    """Get defect breakdown for FVI"""
    
    query = """
        SELECT 
            rejection_reason,
            SUM(rejected_qty) as qty
        FROM `tabSpp Inspection Entry Item`
        WHERE parent = %s
        AND rejection_reason IN ('Over Trim', 'Under Fill (UF)')
        GROUP BY rejection_reason
    """
    
    defects_data = frappe.db.sql(query, (inspection_entry,), as_dict=True)
    
    defects = {}
    for row in defects_data:
        reason = row['rejection_reason']
        if reason == 'Over Trim':
            defects['over_trim'] = flt(row['qty'], 2)
        elif reason == 'Under Fill (UF)':
            defects['under_fill'] = flt(row['qty'], 2)
    
    return defects


def get_mpe_with_rates(lot_list):
    """Backwards compatible function for Phase 1"""
    work_planning_lots = lot_list
    lot_numbers = [lot['lot_number'] for lot in lot_list]
    return get_moulding_data(lot_numbers, work_planning_lots)


def calculate_summary(moulding_data, lot_rejection_data, incoming_data, fvi_data):
    """Calculate overall summary across all stages"""
    
    # Moulding totals
    total_production_qty = sum([flt(row.get('production_qty_nos', 0)) for row in moulding_data])
    total_production_value = sum([flt(row.get('production_value', 0)) for row in moulding_data])
    total_lots = len(set([row['lot_no'] for row in moulding_data]))
    
    # Rejection costs
    lot_rejection_cost = sum([flt(row.get('rejection_cost', 0)) for row in lot_rejection_data])
    incoming_cost = sum([flt(row.get('df_vendor_cost', 0)) for row in incoming_data])
    fvi_cost = sum([flt(row.get('total_fvi_cost', 0)) for row in fvi_data])
    
    total_rejection_cost = lot_rejection_cost + incoming_cost + fvi_cost
    
    # Net value and COPQ
    net_value = total_production_value - total_rejection_cost
    copq_pct = (total_rejection_cost / total_production_value * 100) if total_production_value > 0 else 0
    
    return {
        "total_lots": total_lots,
        "total_production_qty": total_production_qty,
        "total_production_value": total_production_value,
        "lot_rejection_cost": lot_rejection_cost,
        "incoming_cost": incoming_cost,
        "fvi_cost": fvi_cost,
        "total_rejection_cost": total_rejection_cost,
        "net_value": net_value,
        "copq_pct": copq_pct
    }


def get_empty_summary():
    """Return empty summary structure"""
    return {
        "total_lots": 0,
        "total_production_qty": 0,
        "total_production_value": 0,
        "lot_rejection_cost": 0,
        "incoming_cost": 0,
        "fvi_cost": 0,
        "total_rejection_cost": 0,
        "net_value": 0,
        "copq_pct": 0
    }
