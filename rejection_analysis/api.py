import frappe
from frappe import _
from frappe.utils import today, getdate

@frappe.whitelist()
def get_dashboard_metrics(date=None, inspection_type="Lot Inspection"):
    """Get dashboard metrics for specified date and inspection type"""
    if not date:
        date = today()

    # Base filters using DATE_FORMAT for timezone-aware comparison
    filters = {
        "inspection_type": inspection_type,
        "docstatus": 1
    }

    # Get all inspections for the date using SQL for proper date handling
    query = """
        SELECT 
            name, 
            lot_no, 
            total_rejected_qty_in_percentage,
            total_inspected_qty_nos, 
            total_rejected_qty
        FROM `tabInspection Entry`
        WHERE inspection_type = %s
        AND docstatus = 1
        AND DATE_FORMAT(posting_date, '%%Y-%%m-%%d') = %s
    """
    
    inspections = frappe.db.sql(query, (inspection_type, date), as_dict=True)

    if not inspections:
        return {
            "total_lots": 0,
            "pending_lots": 0,
            "avg_rejection": 0.0,
            "lots_exceeding_threshold": 0,
            "total_inspected_qty": 0,
            "total_rejected_qty": 0,
            "patrol_rej_avg": 0.0,
            "line_rej_avg": 0.0,
            "threshold_percentage": 5.0
        }

    # Calculate basic metrics
    total_lots = len(inspections)
    total_inspected = sum([i.get("total_inspected_qty_nos", 0) for i in inspections])
    total_rejected = sum([i.get("total_rejected_qty", 0) for i in inspections])
    avg_rejection = sum([i.get("total_rejected_qty_in_percentage", 0) for i in inspections]) / total_lots if total_lots > 0 else 0

    # Use hardcoded threshold for now (disabled threshold config)
    threshold = 5.0

    lots_exceeding = len([i for i in inspections if i.get("total_rejected_qty_in_percentage", 0) > threshold])

    # For Lot Inspection, calculate Patrol and Line rejection averages
    patrol_rej_avg = 0.0
    line_rej_avg = 0.0
    
    if inspection_type == "Lot Inspection":
        # Get Patrol Inspection average for the same date
        patrol_query = """
            SELECT AVG(total_rejected_qty_in_percentage) as avg_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Patrol Inspection'
            AND docstatus = 1
            AND DATE_FORMAT(posting_date, '%%Y-%%m-%%d') = %s
        """
        patrol_result = frappe.db.sql(patrol_query, (date,), as_dict=True)
        patrol_rej_avg = patrol_result[0].get("avg_rej", 0.0) if patrol_result else 0.0
        
        # Get Line Inspection average for the same date
        line_query = """
            SELECT AVG(total_rejected_qty_in_percentage) as avg_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Line Inspection'
            AND docstatus = 1
            AND DATE_FORMAT(posting_date, '%%Y-%%m-%%d') = %s
        """
        line_result = frappe.db.sql(line_query, (date,), as_dict=True)
        line_rej_avg = line_result[0].get("avg_rej", 0.0) if line_result else 0.0

    return {
        "total_lots": total_lots,
        "pending_lots": 0,  # TODO: Calculate pending lots
        "avg_rejection": round(avg_rejection, 2),
        "lots_exceeding_threshold": lots_exceeding,
        "total_inspected_qty": total_inspected,
        "total_rejected_qty": total_rejected,
        "patrol_rej_avg": round(patrol_rej_avg, 2) if patrol_rej_avg else 0.0,
        "line_rej_avg": round(line_rej_avg, 2) if line_rej_avg else 0.0,
        "threshold_percentage": threshold
    }

@frappe.whitelist()
def get_lot_inspection_report(filters=None):
    """Get detailed lot inspection report with production data"""
    if not filters:
        filters = {}

    date = filters.get("production_date", today())

    # Build SQL query to join all required tables
    query = """
        SELECT
            ie.name as inspection_entry,
            ie.posting_date,
            ie.lot_no,
            ie.product_ref_no as item_code,
            ie.machine_no as press_number,
            ie.operator_name,
            ie.total_rejected_qty_in_percentage as lot_rej_pct,
            ie.total_inspected_qty_nos,
            ie.total_rejected_qty,

            -- Production data from Moulding Production Entry
            mpe.employee_name,
            mpe.mould_reference,
            mpe.moulding_date,

            -- Shift data from Job Card
            jc.shift_type,
            jc.workstation,
            jc.posting_date as job_date,

            -- Aggregated rejection rates
            COALESCE(patrol.avg_rej, 0) as patrol_rej_pct,
            COALESCE(line.avg_rej, 0) as line_rej_pct

        FROM `tabInspection Entry` ie
        LEFT JOIN `tabMoulding Production Entry` mpe ON mpe.scan_lot_number = ie.lot_no
        LEFT JOIN `tabJob Card` jc ON jc.name = mpe.job_card

        -- Subquery for Patrol rejection aggregation
        LEFT JOIN (
            SELECT lot_no, AVG(total_rejected_qty_in_percentage) as avg_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Patrol Inspection' AND docstatus = 1
            GROUP BY lot_no
        ) patrol ON patrol.lot_no = ie.lot_no

        -- Subquery for Line rejection aggregation
        LEFT JOIN (
            SELECT lot_no, AVG(total_rejected_qty_in_percentage) as avg_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Line Inspection' AND docstatus = 1
            GROUP BY lot_no
        ) line ON line.lot_no = ie.lot_no

        WHERE ie.inspection_type = 'Lot Inspection'
        AND ie.docstatus = 1
        AND ie.posting_date = %s
    """

    # Apply additional filters
    params = [date]
    conditions = []

    if filters.get("shift_type"):
        conditions.append("jc.shift_type = %s")
        params.append(filters["shift_type"])

    if filters.get("operator_name"):
        conditions.append("mpe.employee_name LIKE %s")
        params.append(f"%{filters['operator_name']}%")

    if filters.get("press_number"):
        conditions.append("jc.workstation LIKE %s")
        params.append(f"%{filters['press_number']}%")

    if filters.get("item_code"):
        conditions.append("ie.product_ref_no LIKE %s")
        params.append(f"%{filters['item_code']}%")

    if filters.get("mould_ref"):
        conditions.append("mpe.mould_reference LIKE %s")
        params.append(f"%{filters['mould_ref']}%")

    if filters.get("lot_no"):
        conditions.append("ie.lot_no LIKE %s")
        params.append(f"%{filters['lot_no']}%")

    if conditions:
        query += " AND " + " AND ".join(conditions)

    query += " ORDER BY ie.lot_no DESC"

    # Execute query
    data = frappe.db.sql(query, params, as_dict=True)

    # Use hardcoded threshold for now (disabled threshold config)
    threshold = 5.0

    # Process results
    results = []
    for row in data:
        # Use production date from Job Card if available, else inspection date
        production_date = row.get("job_date") or row.get("posting_date")

        # Use workstation from Job Card if available, else machine_no
        press_number = row.get("workstation") or row.get("press_number")

        result = {
            "inspection_entry": row.get("inspection_entry"),
            "production_date": production_date,
            "shift_type": row.get("shift_type"),
            "operator_name": row.get("employee_name"),
            "press_number": press_number,
            "item_code": row.get("item_code"),
            "mould_ref": row.get("mould_reference"),
            "lot_no": row.get("lot_no"),
            "patrol_rej_pct": round(row.get("patrol_rej_pct", 0), 2),
            "line_rej_pct": round(row.get("line_rej_pct", 0), 2),
            "lot_rej_pct": round(row.get("lot_rej_pct", 0), 2),
            "exceeds_threshold": row.get("lot_rej_pct", 0) > threshold,
            "threshold_percentage": threshold
        }
        results.append(result)

    return results

@frappe.whitelist()
def generate_daily_report(report_date, inspection_type, threshold_percentage=5.0):
    """Generate daily rejection report for specified date and inspection type"""

    # Import the function from the doctype
    from rejection_analysis.rejection_analysis.doctype.daily_rejection_report.daily_rejection_report import generate_daily_report as generate_report

    # Call the function
    return generate_report(report_date, inspection_type, threshold_percentage)

@frappe.whitelist()
def create_car_from_inspection(inspection_entry_name):
    """Create a CAR from an inspection entry"""

    # Import the function from the doctype
    from rejection_analysis.rejection_analysis.doctype.corrective_action_report.corrective_action_report import create_car_from_inspection as create_car

    # Call the function
    return create_car(inspection_entry_name)

@frappe.whitelist()
def save_five_why_analysis(car_name, why_answers):
    """Save 5 Why analysis answers"""

    # Import the function from the doctype
    from rejection_analysis.rejection_analysis.doctype.corrective_action_report.corrective_action_report import save_five_why_analysis as save_analysis

    # Call the function
    return save_analysis(car_name, why_answers)