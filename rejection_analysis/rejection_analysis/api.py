"""
Rejection Analysis Console - Backend API
=========================================

This module provides API endpoints for the Rejection Analysis Console.

Key Architecture Principles:
1. Moulding Production Entry (MPE) is always the SOURCE OF TRUTH
2. All queries start with MPE and join other tables using scan_lot_number
3. Backend provides RAW DATA only - no business logic
4. Frontend handles threshold calculations and CAR generation logic
5. Use proper SQL joins as documented in data linkage documentation

Author: Rejection Analysis Team
Date: November 26, 2025
"""

import frappe
from frappe import _
from frappe.utils import today, getdate, flt

# ============================================================================
# DASHBOARD METRICS API
# ============================================================================

@frappe.whitelist()
def get_dashboard_metrics(date=None, inspection_type="Lot Inspection"):
    """
    Get aggregated dashboard metrics for a specific date and inspection type.
    
    STEP-BY-STEP PROCESS:
    ---------------------
    1. Validate and set default date (today if not provided)
    2. Query Inspection Entry table filtered by date and type
    3. Calculate basic metrics (counts, averages, totals)
    4. For Lot Inspection: Calculate Patrol and Line rejection averages
    5. Return structured metrics object
    
    Args:
        date (str): Date in 'YYYY-MM-DD' format (default: today)
        inspection_type (str): One of:
            - "Lot Inspection"
            - "Incoming Inspection"
            - "Final Visual Inspection"
            - "Line Inspection"
            - "Patrol Inspection"
    
    Returns:
        dict: {
            "total_lots": int,              # Total inspections performed
            "pending_lots": int,            # Pending inspections (always 0 for now)
            "avg_rejection": float,         # Average rejection percentage
            "lots_exceeding_threshold": int,# Count exceeding 5% threshold
            "total_inspected_qty": int,     # Total quantity inspected
            "total_rejected_qty": int,      # Total quantity rejected
            "patrol_rej_avg": float,        # Average Patrol rejection % (Lot only)
            "line_rej_avg": float,          # Average Line rejection % (Lot only)
            "threshold_percentage": float   # Threshold value (hardcoded 5.0)
        }
    
    Example:
        >>> get_dashboard_metrics(date="2025-11-26", inspection_type="Lot Inspection")
        {
            "total_lots": 15,
            "avg_rejection": 3.2,
            "lots_exceeding_threshold": 2,
            ...
        }
    """
    
    # STEP 1: Validate input parameters
    if not date:
        date = today()
    
    # STEP 2: Query inspection entries for the specified date and type
    # NOTE: Final Visual Inspection uses SPP Inspection Entry table
    # IMPORTANT: Filter by moulding_date (production date) to match the records query
    if inspection_type == "Final Visual Inspection":
        query = """
            SELECT DISTINCT
                spp_ie.name, 
                spp_ie.lot_no, 
                spp_ie.total_rejected_qty_in_percentage,
                spp_ie.total_inspected_qty_nos, 
                spp_ie.total_rejected_qty
            FROM `tabSPP Inspection Entry` spp_ie
            INNER JOIN `tabMoulding Production Entry` mpe
                ON SUBSTRING_INDEX(spp_ie.lot_no, '-', 1) = mpe.scan_lot_number
            WHERE spp_ie.inspection_type = %s
            AND spp_ie.docstatus = 1
            AND DATE_FORMAT(mpe.moulding_date, '%%Y-%%m-%%d') = %s
        """
    else:
        query = """
            SELECT DISTINCT
                ie.name, 
                ie.lot_no, 
                ie.total_rejected_qty_in_percentage,
                ie.total_inspected_qty_nos, 
                ie.total_rejected_qty
            FROM `tabInspection Entry` ie
            LEFT JOIN `tabMoulding Production Entry` mpe
                ON mpe.scan_lot_number = ie.lot_no
            WHERE ie.inspection_type = %s
            AND ie.docstatus = 1
            AND DATE_FORMAT(mpe.moulding_date, '%%Y-%%m-%%d') = %s
        """
    
    inspections = frappe.db.sql(query, (inspection_type, date), as_dict=True)
    
    # STEP 3: Handle empty results
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
    
    # STEP 4: Calculate basic metrics
    total_lots = len(inspections)
    total_inspected = sum([flt(i.get("total_inspected_qty_nos", 0)) for i in inspections])
    total_rejected = sum([flt(i.get("total_rejected_qty", 0)) for i in inspections])
    
    # Calculate weighted average rejection percentage from totals (more accurate)
    avg_rejection = (total_rejected / total_inspected * 100) if total_inspected > 0 else 0
    
    # STEP 5: Count lots exceeding threshold (hardcoded 5.0%)
    threshold = 5.0
    lots_exceeding = len([i for i in inspections if flt(i.get("total_rejected_qty_in_percentage", 0)) > threshold])
    
    # STEP 6: For Lot Inspection, calculate Patrol and Line rejection averages
    patrol_rej_avg = 0.0
    line_rej_avg = 0.0
    pending_lots = 0
    
    if inspection_type == "Lot Inspection":
        # Get Patrol Inspection average for lots produced on the same date
        patrol_query = """
            SELECT AVG(ie.total_rejected_qty_in_percentage) as avg_rej
            FROM `tabInspection Entry` ie
            LEFT JOIN `tabMoulding Production Entry` mpe
                ON mpe.scan_lot_number = ie.lot_no
            WHERE ie.inspection_type = 'Patrol Inspection'
            AND ie.docstatus = 1
            AND DATE_FORMAT(mpe.moulding_date, '%%Y-%%m-%%d') = %s
        """
        patrol_result = frappe.db.sql(patrol_query, (date,), as_dict=True)
        patrol_rej_avg = flt(patrol_result[0].get("avg_rej", 0.0)) if patrol_result else 0.0
        
        # Get Line Inspection average for lots produced on the same date
        line_query = """
            SELECT AVG(ie.total_rejected_qty_in_percentage) as avg_rej
            FROM `tabInspection Entry` ie
            LEFT JOIN `tabMoulding Production Entry` mpe
                ON mpe.scan_lot_number = ie.lot_no
            WHERE ie.inspection_type = 'Line Inspection'
            AND ie.docstatus = 1
            AND DATE_FORMAT(mpe.moulding_date, '%%Y-%%m-%%d') = %s
        """
        line_result = frappe.db.sql(line_query, (date,), as_dict=True)
        line_rej_avg = flt(line_result[0].get("avg_rej", 0.0)) if line_result else 0.0
        
        # Calculate pending lots: 
        # 1. Lots produced but not inspected (Lot Inspection)
        # 2. Lots with incomplete stages (missing Patrol or Line inspection)
        pending_query = """
            SELECT COUNT(DISTINCT mpe.scan_lot_number) as pending_count
            FROM `tabMoulding Production Entry` mpe
            WHERE DATE_FORMAT(mpe.moulding_date, '%%Y-%%m-%%d') = %s
            AND (
                -- Not yet inspected (no Lot Inspection)
                NOT EXISTS (
                    SELECT 1 FROM `tabInspection Entry` ie 
                    WHERE ie.lot_no = mpe.scan_lot_number 
                    AND ie.inspection_type = 'Lot Inspection'
                    AND ie.docstatus = 1
                )
                OR
                -- Incomplete stages (missing Patrol Inspection)
                NOT EXISTS (
                    SELECT 1 FROM `tabInspection Entry` ie 
                    WHERE ie.lot_no = mpe.scan_lot_number 
                    AND ie.inspection_type = 'Patrol Inspection'
                    AND ie.docstatus = 1
                )
                OR
                -- Incomplete stages (missing Line Inspection)
                NOT EXISTS (
                    SELECT 1 FROM `tabInspection Entry` ie 
                    WHERE ie.lot_no = mpe.scan_lot_number 
                    AND ie.inspection_type = 'Line Inspection'
                    AND ie.docstatus = 1
                )
            )
        """
        pending_result = frappe.db.sql(pending_query, (date,), as_dict=True)
        pending_lots = int(flt(pending_result[0].get("pending_count", 0))) if pending_result else 0
        
    elif inspection_type == "Incoming Inspection":
        # Calculate pending: Lots produced but not inspected (Incoming Inspection)
        pending_query = """
            SELECT COUNT(DISTINCT mpe.scan_lot_number) as pending_count
            FROM `tabMoulding Production Entry` mpe
            WHERE DATE_FORMAT(mpe.moulding_date, '%%Y-%%m-%%d') = %s
            AND NOT EXISTS (
                SELECT 1 FROM `tabInspection Entry` ie 
                WHERE ie.lot_no = mpe.scan_lot_number 
                AND ie.inspection_type = 'Incoming Inspection'
                AND ie.docstatus = 1
            )
        """
        pending_result = frappe.db.sql(pending_query, (date,), as_dict=True)
        pending_lots = int(flt(pending_result[0].get("pending_count", 0))) if pending_result else 0
        
    elif inspection_type == "Final Visual Inspection":
        # Calculate pending: Lots produced but not inspected (Final Visual Inspection)
        pending_query = """
            SELECT COUNT(DISTINCT mpe.scan_lot_number) as pending_count
            FROM `tabMoulding Production Entry` mpe
            WHERE DATE_FORMAT(mpe.moulding_date, '%%Y-%%m-%%d') = %s
            AND NOT EXISTS (
                SELECT 1 FROM `tabSPP Inspection Entry` spp_ie 
                WHERE SUBSTRING_INDEX(spp_ie.lot_no, '-', 1) = mpe.scan_lot_number 
                AND spp_ie.inspection_type = 'Final Visual Inspection'
                AND spp_ie.docstatus = 1
            )
        """
        pending_result = frappe.db.sql(pending_query, (date,), as_dict=True)
        pending_lots = int(flt(pending_result[0].get("pending_count", 0))) if pending_result else 0
    
    # STEP 7: Return structured metrics
    return {
        "total_lots": total_lots,
        "pending_lots": pending_lots,
        "avg_rejection": round(avg_rejection, 2),
        "lots_exceeding_threshold": lots_exceeding,
        "total_inspected_qty": int(total_inspected),
        "total_rejected_qty": int(total_rejected),
        "patrol_rej_avg": round(patrol_rej_avg, 2),
        "line_rej_avg": round(line_rej_avg, 2),
        "threshold_percentage": threshold
    }


# ============================================================================
# LOT INSPECTION REPORT API
# ============================================================================

@frappe.whitelist()
def get_lot_inspection_report(filters=None):
    """
    Get detailed lot inspection report with production data.
    
    STEP-BY-STEP PROCESS:
    ---------------------
    1. Parse and validate filter parameters
    2. Build SQL query starting from Moulding Production Entry (SOURCE OF TRUTH)
    3. Join to Inspection Entry on lot_no = scan_lot_number
    4. Aggregate Patrol and Line rejection percentages via subqueries
    5. Apply user-specified filters (operator, press, item, mould, lot)
    6. Execute query and process results
    7. Calculate exceeds_threshold flag for each record
    8. Return array of lot inspection records
    
    DATA LINKAGE:
    ------------
    Moulding Production Entry (scan_lot_number)
        ↓
    Inspection Entry (lot_no, inspection_type='Lot Inspection')
        ↓
    Aggregated Patrol Inspection (subquery)
    Aggregated Line Inspection (subquery)
    
    Args:
        filters (dict): {
            "production_date": "2025-11-26",  # Required
            "operator_name": "John Doe",       # Optional (partial match)
            "press_number": "P15",             # Optional (partial match)
            "item_code": "T5117",              # Optional (partial match)
            "mould_ref": "MLD-5117-A",         # Optional (partial match)
            "lot_no": "25K26X01"               # Optional (partial match)
        }
    
    Returns:
        list: Array of dictionaries, each containing:
        {
            "inspection_entry": str,        # Inspection Entry ID
            "production_date": str,         # Production date (from MPE or IE)
            "shift_type": str|null,         # Shift type (future enhancement)
            "operator_name": str,           # Operator name (from MPE or IE)
            "press_number": str,            # Machine/Press number
            "item_code": str,               # Item code
            "mould_ref": str,               # Mould reference
            "lot_no": str,                  # Lot number
            "patrol_rej_pct": float,        # Patrol rejection %
            "line_rej_pct": float,          # Line rejection %
            "lot_rej_pct": float,           # Lot rejection %
            "exceeds_threshold": bool,      # True if lot_rej_pct > 5%
            "threshold_percentage": float   # Threshold value (5.0)
        }
    """
    
    # STEP 1: Parse filters
    if not filters:
        filters = {}
    
    date = filters.get("production_date", today())
    
    # STEP 2: Build SQL query
    # KEY PRINCIPLE: Start with Moulding Production Entry (MPE) as source of truth
    query = """
        SELECT DISTINCT
            -- Inspection Entry fields
            ie.name as inspection_entry,
            ie.posting_date,
            ie.lot_no,
            ie.product_ref_no as item_code,
            ie.machine_no as press_number,
            ie.operator_name as ie_operator_name,
            ie.total_rejected_qty_in_percentage as lot_rej_pct,
            ie.total_inspected_qty_nos,
            ie.total_rejected_qty,
            
            -- Moulding Production Entry fields (SOURCE OF TRUTH)
            mpe.employee_name as mpe_operator_name,
            mpe.mould_reference,
            mpe.moulding_date,
            
            -- Job Card fields (for shift information)
            jc.shift_type,
            
            -- Aggregated rejection rates from subqueries
            COALESCE(patrol.avg_rej, 0) as patrol_rej_pct,
            COALESCE(line.avg_rej, 0) as line_rej_pct,
            
            -- CAR Information
            car.name as car_name,
            car.status as car_status
        
        FROM `tabInspection Entry` ie
        
        -- Join to Moulding Production Entry (left join - may not exist for all inspections)
        LEFT JOIN `tabMoulding Production Entry` mpe 
            ON mpe.scan_lot_number = ie.lot_no
        
        -- Join to Job Card (to get shift information)
        LEFT JOIN `tabJob Card` jc
            ON jc.name = mpe.job_card
            
        -- Join to Corrective Action Report
        LEFT JOIN `tabCorrective Action Report` car
            ON car.inspection_entry = ie.name
            AND car.docstatus != 2
        
        -- Subquery: Aggregate Patrol Inspection rejection percentage by lot
        LEFT JOIN (
            SELECT 
                lot_no, 
                AVG(total_rejected_qty_in_percentage) as avg_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Patrol Inspection' 
            AND docstatus = 1
            GROUP BY lot_no
        ) patrol ON patrol.lot_no = ie.lot_no
        
        -- Subquery: Aggregate Line Inspection rejection percentage by lot
        LEFT JOIN (
            SELECT 
                lot_no, 
                AVG(total_rejected_qty_in_percentage) as avg_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Line Inspection' 
            AND docstatus = 1
            GROUP BY lot_no
        ) line ON line.lot_no = ie.lot_no
        
        WHERE ie.inspection_type = 'Lot Inspection'
        AND ie.docstatus = 1
        AND DATE_FORMAT(mpe.moulding_date, '%%Y-%%m-%%d') = %s
    """
    
    # STEP 3: Apply additional filters dynamically
    params = [date]
    conditions = []
    
    if filters.get("operator_name"):
        conditions.append("(mpe.employee_name LIKE %s OR ie.operator_name LIKE %s)")
        params.append(f"%{filters['operator_name']}%")
        params.append(f"%{filters['operator_name']}%")
    
    if filters.get("press_number"):
        conditions.append("ie.machine_no LIKE %s")
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
    
    # STEP 4: Execute query
    data = frappe.db.sql(query, params, as_dict=True)
    
    # STEP 5: Process results
    threshold = 5.0  # Hardcoded threshold
    results = []
    
    for row in data:
        # Use moulding date from MPE if available, else use inspection posting date
        production_date = row.get("moulding_date") or row.get("posting_date")
        
        # Use operator name from MPE if available, else from Inspection Entry
        operator_name = row.get("mpe_operator_name") or row.get("ie_operator_name")
        
        result = {
            "inspection_entry": row.get("inspection_entry"),
            "production_date": str(production_date) if production_date else None,
            "shift_type": row.get("shift_type"),  # Retrieved from Job Card via Moulding Production Entry
            "operator_name": operator_name,
            "press_number": row.get("press_number"),
            "item_code": row.get("item_code"),
            "mould_ref": row.get("mould_reference"),
            "lot_no": row.get("lot_no"),
            "patrol_rej_pct": round(flt(row.get("patrol_rej_pct", 0)), 2),
            "line_rej_pct": round(flt(row.get("line_rej_pct", 0)), 2),
            "lot_rej_pct": round(flt(row.get("lot_rej_pct", 0)), 2),
            "exceeds_threshold": flt(row.get("lot_rej_pct", 0)) > threshold,
            "threshold_percentage": threshold,
            "car_name": row.get("car_name"),
            "car_status": row.get("car_status")
        }
        results.append(result)
    
    return results


# ============================================================================
# INCOMING INSPECTION REPORT API
# ============================================================================

@frappe.whitelist()
def get_incoming_inspection_report(filters=None):
    """
    Get detailed incoming inspection report with deflashing vendor data.
    
    STEP-BY-STEP PROCESS:
    ---------------------
    1. Parse and validate filter parameters
    2. Build SQL query starting from Moulding Production Entry (SOURCE OF TRUTH)
    3. Join to Inspection Entry (inspection_type='Incoming Inspection')
    4. Join to Deflashing Receipt Entry for vendor and quantity data
    5. Join to Job Card for batch information
    6. Apply user-specified filters
    7. Execute query and process results
    8. Calculate exceeds_threshold flag for each record
    9. Return array of incoming inspection records
    
    DATA LINKAGE:
    ------------
    Moulding Production Entry (scan_lot_number)
        ↓
    Inspection Entry (lot_no, inspection_type='Incoming Inspection')
        ↓
    Deflashing Receipt Entry (lot_number) - vendor & qty data
        ↓
    Job Card - batch information
    
    Args:
        filters (dict): {
            "date": "2025-11-26",          # Required - inspection date
            "item": "T5117",               # Optional (exact match)
            "deflasher": "VENDOR-001",     # Optional (partial match)
            "lot_no": "25K26X01",          # Optional (partial match)
            "mould_ref": "MLD-5117-A"      # Optional (partial match)
        }
    
    Returns:
        list: Array of dictionaries, each containing:
        {
            "inspection_entry": str,       # Inspection Entry ID
            "date": str,                   # Inspection date
            "batch_no": str|null,          # Batch number (from Job Card)
            "item": str,                   # Item code
            "mould_ref": str,              # Mould reference
            "lot_no": str,                 # Lot number
            "deflasher_name": str,         # Deflashing vendor name
            "qty_sent": int,               # Quantity sent to deflasher
            "qty_received": int,           # Quantity received back
            "diff_pct": float,             # Difference percentage (loss)
            "inspector_name": str,         # Inspector name
            "insp_qty": int,               # Inspected quantity
            "rej_qty": int,                # Rejected quantity
            "rej_pct": float,              # Rejection percentage
            "exceeds_threshold": bool,     # True if rej_pct > 5%
            "threshold_percentage": float  # Threshold value (5.0)
        }
    """
    
    # STEP 1: Parse filters
    if not filters:
        filters = {}
    
    date = filters.get("date", today())
    
    # STEP 2: Build SQL query
    # KEY PRINCIPLE: Start with Moulding Production Entry as source of truth
    # FIXED: Changed item_to_manufacture to item_to_produce (correct field name)
    query = """
        SELECT DISTINCT
            -- Inspection Entry fields
            ie.posting_date AS date,
            ie.name AS inspection_entry,
            ie.inspector_name,
            ie.total_inspected_qty_nos AS insp_qty,
            ie.total_rejected_qty AS rej_qty,
            ie.total_rejected_qty_in_percentage AS rej_pct,
            
            -- Moulding Production Entry fields (SOURCE OF TRUTH)
            mpe.scan_lot_number AS lot_no,
            mpe.item_to_produce AS item,
            mpe.mould_reference AS mould_ref,
            mpe.employee_name AS operator_name,
            mpe.moulding_date AS production_date,
            mpe.batch_no AS batch_no,
            
            -- Deflashing Receipt Entry fields
            COALESCE(SUBSTRING_INDEX(wh.warehouse_name, ': ', -1), dre.scan_deflashing_vendor) AS deflasher_name,
            dre.qty_despatched_nos AS qty_sent,
            dre.qty_received_nos AS qty_received,
            dre.difference_nos_percentage AS diff_pct,
            dre.posting_date AS receipt_date,
            
            -- CAR Information
            car.name as car_name,
            car.status as car_status
        
        FROM `tabMoulding Production Entry` mpe
        
        -- Join to Inspection Entry (Incoming Inspection)
        INNER JOIN `tabInspection Entry` ie 
            ON ie.lot_no = mpe.scan_lot_number
            AND ie.inspection_type = 'Incoming Inspection'
            AND ie.docstatus = 1
        
        -- Left join to Deflashing Receipt Entry (may not exist for all lots)
        LEFT JOIN `tabDeflashing Receipt Entry` dre 
            ON dre.lot_number = mpe.scan_lot_number
            AND dre.docstatus = 1
            
        -- Left join to Warehouse for Deflasher Name (mapped via barcode)
        LEFT JOIN `tabWarehouse` wh
            ON wh.barcode_text = dre.scan_deflashing_vendor
        
        -- Left join to Job Card for batch information
        LEFT JOIN `tabJob Card` jc 
            ON jc.name = mpe.job_card
            
        -- Join to Corrective Action Report
        LEFT JOIN `tabCorrective Action Report` car
            ON car.inspection_entry = ie.name
            AND car.docstatus != 2
        
        WHERE DATE_FORMAT(mpe.moulding_date, '%%Y-%%m-%%d') = %s
    """
    
    # STEP 3: Apply additional filters dynamically
    params = [date]
    conditions = []
    
    if filters.get("item"):
        conditions.append("mpe.item_to_produce = %s")
        params.append(filters["item"])
    
    if filters.get("deflasher"):
        conditions.append("dre.scan_deflashing_vendor LIKE %s")
        params.append(f"%{filters['deflasher']}%")
    
    if filters.get("lot_no"):
        conditions.append("mpe.scan_lot_number LIKE %s")
        params.append(f"%{filters['lot_no']}%")
    
    if filters.get("mould_ref"):
        conditions.append("mpe.mould_reference LIKE %s")
        params.append(f"%{filters['mould_ref']}%")
    
    if conditions:
        query += " AND " + " AND ".join(conditions)
    
    query += " ORDER BY ie.posting_date DESC, mpe.scan_lot_number DESC"
    
    # STEP 4: Execute query
    data = frappe.db.sql(query, params, as_dict=True)
    
    # STEP 5: Process results
    threshold = 5.0  # Hardcoded threshold
    results = []
    
    for row in data:
        result = {
            "inspection_entry": row.get("inspection_entry"),
            "date": str(row.get("date")) if row.get("date") else None,
            "production_date": str(row.get("production_date")) if row.get("production_date") else None,
            "batch_no": row.get("batch_no"),
            "item": row.get("item"),
            "mould_ref": row.get("mould_ref"),
            "lot_no": row.get("lot_no"),
            "deflasher_name": row.get("deflasher_name") or "—",
            "qty_sent": int(flt(row.get("qty_sent", 0))),
            "qty_received": int(flt(row.get("qty_received", 0))),
            "diff_pct": round(flt(row.get("diff_pct", 0)), 2),
            "inspector_name": row.get("inspector_name"),
            "insp_qty": int(flt(row.get("insp_qty", 0))),
            "rej_qty": int(flt(row.get("rej_qty", 0))),
            "rej_pct": round(flt(row.get("rej_pct", 0)), 2),
            "exceeds_threshold": flt(row.get("rej_pct", 0)) > threshold,
            "threshold_percentage": threshold,
            "car_name": row.get("car_name"),
            "car_status": row.get("car_status")
        }
        results.append(result)
    
    return results


# ============================================================================
# FINAL INSPECTION REPORT API
# ============================================================================

@frappe.whitelist()
def get_final_inspection_report(filters=None):
    """
    Get detailed final visual inspection report with all rejection stages.
    
    STEP-BY-STEP PROCESS:
    ---------------------
    1. Parse and validate filter parameters
    2. Build SQL query starting from Moulding Production Entry (SOURCE OF TRUTH)
    3. Join to SPP Inspection Entry (inspection_type='Final Visual Inspection')
    4. Join to Job Card for production context (shift, press, batch)
    5. Aggregate Patrol, Line, and Lot rejection percentages via subqueries
    6. Apply user-specified filters
    7. Execute query and process results
    8. Calculate exceeds_threshold flag based on final_insp_rej_pct
    9. Return array of final inspection records
    
    DATA LINKAGE:
    ------------
    Moulding Production Entry (scan_lot_number)
        ↓
    SPP Inspection Entry (lot_no, inspection_type='Final Visual Inspection')
        ↓
    Job Card (shift_type, workstation, batch_no)
        ↓
    Aggregated Patrol Inspection (subquery)
    Aggregated Line Inspection (subquery)
    Aggregated Lot Inspection (subquery)
    
    UNIQUE FEATURES:
    ---------------
    - Uses SPP Inspection Entry (not regular Inspection Entry)
    - Shows ALL 4 rejection stages: Patrol → Line → Lot → Final
    - Primary metric is final_insp_rej_pct
    - Includes warehouse and stage information
    
    Args:
        filters (dict): {
            "date": "2025-11-26",          # Required - inspection date
            "shift_type": "A",             # Optional
            "operator_name": "John Doe",   # Optional (partial match)
            "press_number": "P15",         # Optional
            "item": "T5117",               # Optional
            "mould_ref": "MLD-5117-A",     # Optional (partial match)
            "lot_no": "25K26X01"           # Optional (partial match)
        }
    
    Returns:
        list: Array of dictionaries, each containing:
        {
            "spp_inspection_entry": str,   # SPP Inspection Entry ID
            "inspection_date": str,        # Inspection date
            "production_date": str|null,   # Production date (from Job Card)
            "shift_type": str|null,        # Shift type
            "operator_name": str,          # Operator name (from MPE)
            "press_number": str|null,      # Press/workstation
            "item": str,                   # Item code
            "mould_ref": str,              # Mould reference
            "lot_no": str,                 # Lot number
            "patrol_rej_pct": float,       # Patrol rejection %
            "line_rej_pct": float,         # Line rejection %
            "lot_rej_pct": float,          # Lot rejection %
            "final_insp_rej_pct": float,   # Final inspection % (PRIMARY)
            "final_inspector": str,        # Final inspector name
            "final_insp_qty": int,         # Final inspected quantity
            "final_rej_qty": int,          # Final rejected quantity
            "warehouse": str|null,         # Target warehouse
            "stage": str|null,             # Production stage
            "exceeds_threshold": bool,     # True if final_insp_rej_pct > 5%
            "threshold_percentage": float  # Threshold value (5.0)
        }
    """
    
    # STEP 1: Parse filters
    if not filters:
        filters = {}
    
    date = filters.get("date", today())
    
    # STEP 2: Build SQL query
    # KEY PRINCIPLE: Start with Moulding Production Entry as source of truth
    # NOTE: Uses SPP Inspection Entry (not regular Inspection Entry)
    query = """
        SELECT DISTINCT
            -- SPP Inspection Entry fields
            spp_ie.posting_date AS inspection_date,
            spp_ie.name AS spp_inspection_entry,
            spp_ie.lot_no,
            spp_ie.inspector_name AS final_inspector,
            spp_ie.total_inspected_qty_nos AS final_insp_qty,
            spp_ie.total_rejected_qty AS final_rej_qty,
            -- Calculate percentage from quantities if stored value is 0
            CASE 
                WHEN spp_ie.total_rejected_qty_in_percentage > 0 THEN spp_ie.total_rejected_qty_in_percentage
                WHEN spp_ie.total_inspected_qty_nos > 0 THEN (spp_ie.total_rejected_qty / spp_ie.total_inspected_qty_nos) * 100
                ELSE 0
            END AS final_insp_rej_pct,
            spp_ie.warehouse,
            spp_ie.stage,
            
            -- Moulding Production Entry fields (SOURCE OF TRUTH)
            mpe.item_to_produce AS item,
            mpe.mould_reference AS mould_ref,
            mpe.employee_name AS operator_name,
            mpe.moulding_date AS production_date,
            
            -- Job Card fields (production context)
            jc.posting_date AS job_date,
            jc.shift_type,
            jc.workstation AS press_number,
            jc.batch_no,
            
            -- Aggregated rejection rates from earlier inspection stages
            COALESCE(patrol.avg_rej, 0) AS patrol_rej_pct,
            COALESCE(line.avg_rej, 0) AS line_rej_pct,
            COALESCE(lot_insp.lot_rej, 0) AS lot_rej_pct,
            
            -- CAR Information
            car.name as car_name,
            car.status as car_status
        
        FROM `tabMoulding Production Entry` mpe
        
        -- Join to SPP Inspection Entry (Final Visual Inspection)
        -- NOTE: SPP lot_no has suffix (e.g., "25H11U03-3"), MPE has base (e.g., "25H11U03")
        -- Use SUBSTRING_INDEX to extract base lot number before the dash
        INNER JOIN `tabSPP Inspection Entry` spp_ie 
            ON SUBSTRING_INDEX(spp_ie.lot_no, '-', 1) = mpe.scan_lot_number
            AND spp_ie.inspection_type = 'Final Visual Inspection'
            AND spp_ie.docstatus = 1
        
        -- Left join to Job Card for production context
        LEFT JOIN `tabJob Card` jc 
            ON jc.name = mpe.job_card
            
        -- Join to Corrective Action Report
        LEFT JOIN `tabCorrective Action Report` car
            ON car.inspection_entry = spp_ie.name
            AND car.docstatus != 2
        
        -- Subquery: Aggregate Patrol Inspection rejection percentage
        LEFT JOIN (
            SELECT 
                lot_no, 
                AVG(
                    CASE 
                        WHEN total_rejected_qty_in_percentage > 0 THEN total_rejected_qty_in_percentage
                        WHEN total_inspected_qty_nos > 0 THEN (total_rejected_qty / total_inspected_qty_nos) * 100
                        ELSE 0
                    END
                ) AS avg_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Patrol Inspection' 
            AND docstatus = 1
            GROUP BY lot_no
        ) patrol ON patrol.lot_no = SUBSTRING_INDEX(spp_ie.lot_no, '-', 1)
        
        -- Subquery: Aggregate Line Inspection rejection percentage
        LEFT JOIN (
            SELECT 
                lot_no, 
                AVG(
                    CASE 
                        WHEN total_rejected_qty_in_percentage > 0 THEN total_rejected_qty_in_percentage
                        WHEN total_inspected_qty_nos > 0 THEN (total_rejected_qty / total_inspected_qty_nos) * 100
                        ELSE 0
                    END
                ) AS avg_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Line Inspection' 
            AND docstatus = 1
            GROUP BY lot_no
        ) line ON line.lot_no = SUBSTRING_INDEX(spp_ie.lot_no, '-', 1)
        
        -- Subquery: Get Lot Inspection rejection percentage
        LEFT JOIN (
            SELECT 
                lot_no, 
                CASE 
                    WHEN total_rejected_qty_in_percentage > 0 THEN total_rejected_qty_in_percentage
                    WHEN total_inspected_qty_nos > 0 THEN (total_rejected_qty / total_inspected_qty_nos) * 100
                    ELSE 0
                END AS lot_rej
            FROM `tabInspection Entry`
            WHERE inspection_type = 'Lot Inspection' 
            AND docstatus = 1
        ) lot_insp ON lot_insp.lot_no = SUBSTRING_INDEX(spp_ie.lot_no, '-', 1)
        
        WHERE DATE_FORMAT(mpe.moulding_date, '%%Y-%%m-%%d') = %s
    """
    
    # STEP 3: Apply additional filters dynamically
    params = [date]
    conditions = []
    
    if filters.get("shift_type"):
        conditions.append("jc.shift_type = %s")
        params.append(filters["shift_type"])
    
    if filters.get("operator_name"):
        conditions.append("mpe.employee_name LIKE %s")
        params.append(f"%{filters['operator_name']}%")
    
    if filters.get("press_number"):
        conditions.append("jc.workstation = %s")
        params.append(filters["press_number"])
    
    if filters.get("item"):
        conditions.append("mpe.item_to_produce = %s")
        params.append(filters["item"])
    
    if filters.get("mould_ref"):
        conditions.append("mpe.mould_reference LIKE %s")
        params.append(f"%{filters['mould_ref']}%")
    
    if filters.get("lot_no"):
        conditions.append("mpe.scan_lot_number LIKE %s")
        params.append(f"%{filters['lot_no']}%")
    
    if conditions:
        query += " AND " + " AND ".join(conditions)
    
    query += " ORDER BY spp_ie.posting_date DESC, mpe.scan_lot_number DESC"
    
    # STEP 4: Execute query
    data = frappe.db.sql(query, params, as_dict=True)
    
    # STEP 5: Process results
    threshold = 5.0  # Hardcoded threshold
    results = []
    
    for row in data:
        # Use moulding production date as the primary production date
        production_date = row.get("production_date")
        
        # Extract base lot number (part before the dash for sub-lots)
        lot_no = row.get("lot_no") or ""
        base_lot_no = lot_no.split('-')[0] if '-' in lot_no else lot_no
        
        # Fetch Trimming Operator safely
        trimming_operator = "—"
        try:
            # Generate potential batch numbers to check (handle 'P' prefix)
            potential_batch_nos = list(set([
                lot_no, 
                base_lot_no,
                f"P{lot_no}",
                f"P{base_lot_no}"
            ]))
            
            # 1. Try fetching from SPP Lot Resource Tagging (Smart Screens app)
            trimming_data = frappe.db.sql("""
                SELECT GROUP_CONCAT(DISTINCT operator_name SEPARATOR ', ') as operator_name
                FROM `tabSPP Lot Resource Tagging`
                WHERE batch_no IN %s
                AND operation_type IN ('ID Trimming', 'OD Trimming', 'Trimming')
                AND docstatus = 1
            """, (potential_batch_nos,), as_dict=True)
            
            if trimming_data and trimming_data[0].operator_name:
                trimming_operator = trimming_data[0].operator_name
            
            # 2. If not found, try Lot Resource Tagging (Shree Polymer Custom app)
            if trimming_operator == "—":
                trimming_data_old = frappe.db.sql("""
                    SELECT GROUP_CONCAT(DISTINCT operator_name SEPARATOR ', ') as operator_name
                    FROM `tabLot Resource Tagging`
                    WHERE scan_lot_no IN %s
                    AND operation_type IN ('ID Trimming', 'OD Trimming', 'Trimming')
                    AND docstatus = 1
                """, (potential_batch_nos,), as_dict=True)
                
                if trimming_data_old and trimming_data_old[0].operator_name:
                    trimming_operator = trimming_data_old[0].operator_name
                    
        except Exception:
            # Ignore errors if tables don't exist
            pass
        
        result = {
            "spp_inspection_entry": row.get("spp_inspection_entry"),
            "inspection_date": str(row.get("inspection_date")) if row.get("inspection_date") else None,
            "production_date": str(production_date) if production_date else None,
            "shift_type": row.get("shift_type"),
            "operator_name": row.get("operator_name"),
            "press_number": row.get("press_number"),
            "item": row.get("item"),
            "mould_ref": row.get("mould_ref"),
            "lot_no": row.get("lot_no"),
            "base_lot_no": base_lot_no,  # Added for grouping
            "patrol_rej_pct": round(flt(row.get("patrol_rej_pct", 0)), 2),
            "line_rej_pct": round(flt(row.get("line_rej_pct", 0)), 2),
            "lot_rej_pct": round(flt(row.get("lot_rej_pct", 0)), 2),
            "final_insp_rej_pct": round(flt(row.get("final_insp_rej_pct", 0)), 2),
            "final_inspector": row.get("final_inspector"),
            "final_insp_qty": int(flt(row.get("final_insp_qty", 0))),
            "final_rej_qty": int(flt(row.get("final_rej_qty", 0))),
            "trimming_operator": trimming_operator,
            "warehouse": row.get("warehouse"),
            "stage": row.get("stage"),
            "exceeds_threshold": flt(row.get("final_insp_rej_pct", 0)) > threshold,
            "threshold_percentage": threshold,
            "car_name": row.get("car_name"),
            "car_status": row.get("car_status")
        }
        results.append(result)
    
    return results


# ============================================================================
# CORRECTIVE ACTION REPORT (CAR) FUNCTIONS
# ============================================================================

@frappe.whitelist()
def get_car_by_inspection(inspection_entry_name):
    """
    Check if a CAR already exists for the given inspection entry.
    
    Args:
        inspection_entry_name (str): Name of the Inspection Entry document
        
    Returns:
        dict: {"exists": bool, "car_name": str or None, "status": str}
    """
    try:
        # Check in all three possible fields across different inspection types
        existing_car = frappe.db.get_value(
            "Corrective Action Report",
            {
                "inspection_entry": inspection_entry_name,
                "docstatus": ["!=", 2]  # Exclude cancelled documents
            },
            ["name", "status", "docstatus"],
            as_dict=True
        )
        
        if existing_car:
            return {
                "exists": True,
                "car_name": existing_car.name,
                "status": existing_car.status or "Open",
                "docstatus": existing_car.docstatus
            }
        
        return {
            "exists": False,
            "car_name": None,
            "status": None
        }
        
    except Exception as e:
        frappe.log_error(f"Error checking for existing CAR: {str(e)}", "get_car_by_inspection")
        return {
            "exists": False,
            "car_name": None,
            "error": str(e)
        }


@frappe.whitelist()
def update_car(car_name, car_data):
    """
    Update an existing CAR with new data.
    
    Args:
        car_name (str): Name of the CAR document to update
        car_data (dict or str): CAR data to update
        
    Returns:
        dict: {"name": str, "status": str}
    """
    try:
        # Log the update attempt
        frappe.errprint(f"Updating CAR: {car_name}")
        # frappe.errprint(f"Data: {car_data}")

        # Parse car_data if it's a string
        if isinstance(car_data, str):
            import json
            car_data = json.loads(car_data)
        
        # Get the existing CAR document
        if not frappe.db.exists("Corrective Action Report", car_name):
            frappe.throw(f"CAR {car_name} not found")

        car = frappe.get_doc("Corrective Action Report", car_name)
        
        if car.docstatus == 1:
            frappe.throw("Cannot update a submitted CAR. Please cancel and amend it if needed.")
        
        if car.docstatus == 2:
            frappe.throw("Cannot update a cancelled CAR.")

        # Update fields if provided in car_data
        updatable_fields = [
            'problem_description',
            'cause_for_non_detection',
            'cause_for_occurrence',
            'corrective_action',
            'preventive_measures',
            'assigned_to',
            'target_date',
            'remarks'
        ]
        
        for field in updatable_fields:
            if field in car_data:
                value = car_data[field]
                
                # Convert date strings to date objects for date fields
                if field == 'target_date' and value and isinstance(value, str):
                    value = getdate(value)
                
                setattr(car, field, value)
        
        # Update 5 Why Analysis if provided
        if 'why_analysis' in car_data:
            # Clear existing rows
            car.set('five_why_analysis', [])
            
            # Add new rows
            if car_data['why_analysis']:
                for why_data in car_data['why_analysis']:
                    car.append('five_why_analysis', {
                        'why_question': why_data.get('why_question', ''),
                        'answer': why_data.get('answer', '')
                    })
        
        # Save the document
        car.save(ignore_permissions=True)
        
        return {
            "name": car.name,
            "status": car.status,
            "message": "updated"
        }
        
    except Exception as e:
        frappe.log_error(f"Error updating CAR {car_name}: {str(e)}", "update_car")
        # Return the specific error message
        frappe.throw(str(e))


@frappe.whitelist()
def get_pending_cars_for_date(report_date, threshold_percentage=5.0):
    """
    Get SUMMARY of CAR status for a specific date.
    Returns counts only - no full records to avoid duplicates.
    
    Args:
        report_date (str): Date to check (YYYY-MM-DD)
        threshold_percentage (float): Rejection threshold (default: 5.0)
        
    Returns:
        dict: {
            "lot_inspection_summary": {
                "total_exceeding_threshold": int,
                "cars_filled": int,
                "cars_pending": int
            },
            "incoming_inspection_summary": {...},
            "final_inspection_summary": {...},
            "total_exceeding_threshold": int,
            "total_cars_filled": int,
            "total_cars_pending": int
        }
    """
    try:
        threshold = float(threshold_percentage)
        
        # Initialize summary counters
        lot_summary = {"total_exceeding_threshold": 0, "cars_filled": 0, "cars_pending": 0}
        incoming_summary = {"total_exceeding_threshold": 0, "cars_filled": 0, "cars_pending": 0}
        final_summary = {"total_exceeding_threshold": 0, "cars_filled": 0, "cars_pending": 0}
        
        # =====================================================================
        # LOT INSPECTIONS SUMMARY
        # =====================================================================
        lot_report = get_lot_inspection_report(filters={"production_date": report_date})
        
        for record in lot_report:
            if record.get("lot_rej_pct", 0) >= threshold:
                lot_summary["total_exceeding_threshold"] += 1
                
                # Check if CAR exists
                car_exists = frappe.db.exists(
                    "Corrective Action Report",
                    {
                        "inspection_entry": record.get("inspection_entry"),
                        "docstatus": ["!=", 2]
                    }
                )
                
                if car_exists:
                    lot_summary["cars_filled"] += 1
                else:
                    lot_summary["cars_pending"] += 1
        
        # =====================================================================
        # INCOMING INSPECTIONS SUMMARY
        # =====================================================================
        incoming_report = get_incoming_inspection_report(filters={"date": report_date})
        
        for record in incoming_report:
            if record.get("rej_pct", 0) >= threshold:
                incoming_summary["total_exceeding_threshold"] += 1
                
                car_exists = frappe.db.exists(
                    "Corrective Action Report",
                    {
                        "inspection_entry": record.get("inspection_entry"),
                        "docstatus": ["!=", 2]
                    }
                )
                
                if car_exists:
                    incoming_summary["cars_filled"] += 1
                else:
                    incoming_summary["cars_pending"] += 1
        
        # =====================================================================
        # FINAL VISUAL INSPECTIONS SUMMARY
        # =====================================================================
        final_report = get_final_inspection_report(filters={"date": report_date})
        
        for record in final_report:
            if record.get("final_insp_rej_pct", 0) >= threshold:
                final_summary["total_exceeding_threshold"] += 1
                
                car_exists = frappe.db.exists(
                    "Corrective Action Report",
                    {
                        "inspection_entry": record.get("spp_inspection_entry"),
                        "docstatus": ["!=", 2]
                    }
                )
                
                if car_exists:
                    final_summary["cars_filled"] += 1
                else:
                    final_summary["cars_pending"] += 1
        
        # =====================================================================
        # CALCULATE TOTALS
        # =====================================================================
        return {
            "lot_inspection_summary": lot_summary,
            "incoming_inspection_summary": incoming_summary,
            "final_inspection_summary": final_summary,
            "total_exceeding_threshold": (
                lot_summary["total_exceeding_threshold"] +
                incoming_summary["total_exceeding_threshold"] +
                final_summary["total_exceeding_threshold"]
            ),
            "total_cars_filled": (
                lot_summary["cars_filled"] +
                incoming_summary["cars_filled"] +
                final_summary["cars_filled"]
            ),
            "total_cars_pending": (
                lot_summary["cars_pending"] +
                incoming_summary["cars_pending"] +
                final_summary["cars_pending"]
            )
        }
        
    except Exception as e:
        frappe.log_error(f"Error fetching pending CARs for {report_date}: {str(e)}", "get_pending_cars_for_date")
        return {
            "lot_inspection_summary": {"total_exceeding_threshold": 0, "cars_filled": 0, "cars_pending": 0},
            "incoming_inspection_summary": {"total_exceeding_threshold": 0, "cars_filled": 0, "cars_pending": 0},
            "final_inspection_summary": {"total_exceeding_threshold": 0, "cars_filled": 0, "cars_pending": 0},
            "total_exceeding_threshold": 0,
            "total_cars_filled": 0,
            "total_cars_pending": 0,
            "error": str(e)
        }


@frappe.whitelist()
def create_car_from_inspection(inspection_entry_name, car_data=None):
    """
    Create a CAR from an inspection entry with optional additional data.
    
    Args:
        inspection_entry_name (str): Name of the Inspection Entry document
        car_data (dict): Optional additional CAR data including:
            - problem_description
            - cause_for_non_detection
            - cause_for_occurrence
            - corrective_action
            - preventive_measures
            - remarks
            - why_analysis (dict with why_1 to why_5)
            - assigned_to
            - target_date
    
    Returns:
        dict: {"name": str, "status": str}
    """
    import json
    
    try:
        # Parse car_data if it's a string
        if isinstance(car_data, str):
            car_data = json.loads(car_data)
        
        if not car_data:
            car_data = {}
        
        # Get inspection entry
        inspection_doctype = "Inspection Entry"
        if not frappe.db.exists("Inspection Entry", inspection_entry_name):
            if frappe.db.exists("SPP Inspection Entry", inspection_entry_name):
                inspection_doctype = "SPP Inspection Entry"
            else:
                frappe.throw(f"Inspection Entry {inspection_entry_name} not found")
        
        inspection = frappe.get_doc(inspection_doctype, inspection_entry_name)
        
        # Build default problem description if not provided
        if not car_data.get('problem_description'):
            defects = []
            if hasattr(inspection, 'items'):
                for item in inspection.items:
                    if item.get('rejected_qty', 0) > 0:
                        defects.append(f"{item.get('type_of_defect', 'Unknown')}: {item.rejected_qty}")
            
            # Handle different field names between DocTypes
            insp_type = inspection.inspection_type
            lot_no = inspection.lot_no
            
            # SPP Inspection Entry might have different field names
            # Fallback to safe gets
            rejected_pct = getattr(inspection, 'total_rejected_qty_in_percentage', 0)
            inspected_qty = getattr(inspection, 'total_inspected_qty_nos', 0)
            rejected_qty = getattr(inspection, 'total_rejected_qty', 0)
            
            # For SPP, product/machine/operator might not be directly on the doc
            # We'll use what we can find or leave generic
            product = getattr(inspection, 'product_ref_no', getattr(inspection, 'item_code', 'Unknown'))
            inspector = getattr(inspection, 'inspector_name', 'Unknown')
            machine = getattr(inspection, 'machine_no', getattr(inspection, 'workstation', 'Unknown'))
            operator = getattr(inspection, 'operator_name', 'Unknown')

            car_data['problem_description'] = f"""High rejection ({rejected_pct}%) found in {insp_type} for lot {lot_no}.

Inspected Qty: {inspected_qty}
Rejected Qty: {rejected_qty}
Product: {product}
Inspector: {inspector}
Machine: {machine}
Operator: {operator}

Defects Found:
{chr(10).join(defects) if defects else 'See inspection entry for details'}"""
        
        # Create CAR document
        # Map fields safely
        target_date_value = car_data.get('target_date')
        if target_date_value and isinstance(target_date_value, str):
            target_date_value = getdate(target_date_value)
        
        car_doc = {
            "doctype": "Corrective Action Report",
            "car_date": frappe.utils.today(),
            "inspection_entry": inspection_entry_name,
            "lot_no": inspection.lot_no,
            "product_ref_no": getattr(inspection, 'product_ref_no', getattr(inspection, 'item_code', None)),
            "rejection_percentage": getattr(inspection, 'total_rejected_qty_in_percentage', 0),
            "problem_description": car_data.get('problem_description'),
            "cause_for_non_detection": car_data.get('cause_for_non_detection'),
            "cause_for_occurrence": car_data.get('cause_for_occurrence'),
            "corrective_action": car_data.get('corrective_action'),
            "remarks": car_data.get('remarks'),
            "assigned_to": car_data.get('assigned_to') or None,
            "target_date": target_date_value,
            "status": "Open"
        }
        
        car = frappe.get_doc(car_doc)
        
        # Add 5 Why Analysis if provided
        why_analysis = car_data.get('why_analysis', {})
        if why_analysis:
            for i in range(1, 6):
                why_key = f"why_{i}"
                if why_analysis.get(why_key):
                    car.append("five_why_analysis", {
                        why_key: why_analysis[why_key]
                    })
        
        car.insert(ignore_links=True)
        frappe.db.commit()
        
        return {
            "name": car.name,
            "status": "success"
        }
    
    except Exception as e:
        frappe.log_error(message=str(e), title="CAR Creation Error")
        frappe.throw(_("Failed to create CAR: {0}").format(str(e)))


@frappe.whitelist()
def save_five_why_analysis(car_name, why_answers):
    """
    Save 5 Why analysis answers to a CAR.
    
    This is a wrapper function that delegates to the DocType-specific logic.
    
    Args:
        car_name (str): Name of the CAR document
        why_answers (list): Array of 5 why answers
    
    Returns:
        dict: {"status": str}
    """
    try:
        from rejection_analysis.rejection_analysis.doctype.corrective_action_report.corrective_action_report import save_five_why_analysis as save_analysis
        return save_analysis(car_name, why_answers)
    except ImportError:
        frappe.throw(_("Corrective Action Report DocType not found. Please create it first."))


@frappe.whitelist()
def generate_daily_report(report_date, inspection_type, threshold_percentage=5.0):
    """
    Generate daily rejection report for specified date and inspection type.
    
    This is a wrapper function that delegates to the DocType-specific logic.
    
    Args:
        report_date (str): Date in 'YYYY-MM-DD' format
        inspection_type (str): Type of inspection
        threshold_percentage (float): Threshold value (default: 5.0)
    
    Returns:
        dict: Generated report details
    """
    try:
        from rejection_analysis.rejection_analysis.doctype.daily_rejection_report.daily_rejection_report import generate_daily_report as generate_report
        return generate_report(report_date, inspection_type, threshold_percentage)
    except ImportError:
        frappe.throw(_("Daily Rejection Report DocType not found. Please create it first."))


@frappe.whitelist()
def generate_comprehensive_daily_report(date=None, threshold_percentage=5.0):
    """
    Generate comprehensive daily rejection report for all inspection types.
    
    This function creates a single Daily Rejection Report document containing:
    - Lot Inspection data and metrics
    - Incoming Inspection data and metrics
    - Final Visual Inspection data and metrics
    
    The report is created in Draft status and checks for duplicates.
    
    Args:
        date (str): Report date in 'YYYY-MM-DD' format (defaults to today)
        threshold_percentage (float): Rejection threshold percentage (default: 5.0)
    
    Returns:
        dict: {
            "status": "success"|"exists"|"error",
            "name": Document name if created/exists,
            "message": Status message
        }
    """
    if not date:
        date = today()
    
    # Convert threshold to float (in case it comes as string from API)
    threshold_percentage = flt(threshold_percentage)
    
    try:
        # Check if report already exists for this date
        existing = frappe.db.exists("Daily Rejection Report", {"report_date": date})
        if existing:
            return {
                "status": "exists",
                "name": existing,
                "message": f"Report already exists for {date}"
            }
        
        # Fetch data from all three inspection APIs (call internal functions directly)
        # Note: These functions return lists directly, not wrapped in {"data": [...]}
        lot_items = get_lot_inspection_report({"production_date": date}) or []
        incoming_items = get_incoming_inspection_report({"date": date}) or []
        final_items = get_final_inspection_report({"date": date}) or []
        
        # Calculate lot inspection metrics
        lot_total = len(lot_items)
        lot_exceeding = sum(1 for item in lot_items if item.get("exceeds_threshold"))
        lot_avg_rejection = 0
        lot_patrol_avg = 0
        lot_line_avg = 0
        
        if lot_total > 0:
            lot_avg_rejection = sum(flt(item.get("lot_rej_pct", 0)) for item in lot_items) / lot_total
            lot_patrol_avg = sum(flt(item.get("patrol_rej_pct", 0)) for item in lot_items) / lot_total
            lot_line_avg = sum(flt(item.get("line_rej_pct", 0)) for item in lot_items) / lot_total
        
        # Calculate incoming inspection metrics
        incoming_total = len(incoming_items)
        incoming_exceeding = sum(1 for item in incoming_items if flt(item.get("rej_pct", 0)) > threshold_percentage)
        incoming_avg_rejection = 0
        
        if incoming_total > 0:
            incoming_avg_rejection = sum(flt(item.get("rej_pct", 0)) for item in incoming_items) / incoming_total
        
        # Calculate final inspection metrics
        final_total = len(final_items)
        final_exceeding = sum(1 for item in final_items if item.get("exceeds_threshold"))
        final_avg_rejection = 0
        final_patrol_avg = 0
        final_line_avg = 0
        final_lot_avg = 0
        
        if final_total > 0:
            final_avg_rejection = sum(flt(item.get("final_insp_rej_pct", 0)) for item in final_items) / final_total
            final_patrol_avg = sum(flt(item.get("patrol_rej_pct", 0)) for item in final_items) / final_total
            final_line_avg = sum(flt(item.get("line_rej_pct", 0)) for item in final_items) / final_total
            final_lot_avg = sum(flt(item.get("lot_rej_pct", 0)) for item in final_items) / final_total
        
        # Create the Daily Rejection Report document
        report = frappe.get_doc({
            "doctype": "Daily Rejection Report",
            "report_date": date,
            "threshold_percentage": threshold_percentage,
            "status": "Draft",
            
            # Lot Inspection Summary
            "lot_total_inspections": lot_total,
            "lot_avg_rejection": lot_avg_rejection,
            "lot_exceeding_threshold": lot_exceeding,
            "lot_patrol_avg": lot_patrol_avg,
            "lot_line_avg": lot_line_avg,
            
            # Incoming Inspection Summary
            "incoming_total_inspections": incoming_total,
            "incoming_avg_rejection": incoming_avg_rejection,
            "incoming_exceeding_threshold": incoming_exceeding,
            
            # Final Inspection Summary
            "final_total_inspections": final_total,
            "final_avg_rejection": final_avg_rejection,
            "final_exceeding_threshold": final_exceeding,
            "final_patrol_avg": final_patrol_avg,
            "final_line_avg": final_line_avg,
            "final_lot_avg": final_lot_avg,
            
            # Child tables - map API data to child table fields
            "lot_inspection_items": [
                {
                    "inspection_entry": item.get("inspection_entry"),
                    "production_date": item.get("production_date"),
                    "lot_no": item.get("lot_no"),
                    "shift_type": item.get("shift_type"),
                    "operator_name": item.get("operator_name"),
                    "press_number": item.get("press_number"),
                    "item_code": item.get("item_code"),
                    "mould_ref": item.get("mould_ref"),
                    "patrol_rej_pct": item.get("patrol_rej_pct"),
                    "line_rej_pct": item.get("line_rej_pct"),
                    "lot_rej_pct": item.get("lot_rej_pct"),
                    "inspected_qty": item.get("inspected_qty"),
                    "rejected_qty": item.get("rejected_qty"),
                    "exceeds_threshold": item.get("exceeds_threshold"),
                    "car_required": item.get("car_required"),
                    "car_reference": item.get("car_reference"),
                    "car_status": item.get("car_status")
                }
                for item in lot_items
            ],
            
            "incoming_inspection_items": [
                {
                    "inspection_entry": item.get("inspection_entry"),
                    "date": item.get("date"),
                    "lot_no": item.get("lot_no"),
                    "batch_no": item.get("batch_no"),
                    "item": item.get("item"),
                    "mould_ref": item.get("mould_ref"),
                    "deflasher_name": item.get("deflasher_name"),
                    "qty_sent": item.get("qty_sent"),
                    "qty_received": item.get("qty_received"),
                    "diff_pct": item.get("diff_pct"),
                    "inspector_name": item.get("inspector_name"),
                    "insp_qty": item.get("insp_qty"),
                    "rejected_qty": item.get("rejected_qty"),
                    "rej_pct": item.get("rej_pct"),
                    "car_required": 1 if flt(item.get("rej_pct", 0)) > threshold_percentage else 0,
                    "car_reference": item.get("car_reference"),
                    "car_status": item.get("car_status")
                }
                for item in incoming_items
            ],
            
            "final_inspection_items": [
                {
                    "spp_inspection_entry": item.get("spp_inspection_entry"),
                    "production_date": item.get("production_date"),
                    "lot_no": item.get("lot_no"),
                    "shift_type": item.get("shift_type"),
                    "operator_name": item.get("operator_name"),
                    "press_number": item.get("press_number"),
                    "item": item.get("item"),
                    "mould_ref": item.get("mould_ref"),
                    "patrol_rej_pct": item.get("patrol_rej_pct"),
                    "line_rej_pct": item.get("line_rej_pct"),
                    "lot_rej_pct": item.get("lot_rej_pct"),
                    "final_insp_rej_pct": item.get("final_insp_rej_pct"),
                    "final_inspector": item.get("final_inspector"),
                    "final_insp_qty": item.get("final_insp_qty"),
                    "final_rej_qty": item.get("final_rej_qty"),
                    "warehouse": item.get("warehouse"),
                    "stage": item.get("stage"),
                    "exceeds_threshold": item.get("exceeds_threshold"),
                    "car_required": item.get("car_required"),
                    "car_reference": item.get("car_reference"),
                    "car_status": item.get("car_status")
                }
                for item in final_items
            ]
        })
        
        report.insert()
        frappe.db.commit()
        
        return {
            "status": "success",
            "name": report.name,
            "message": f"Daily Rejection Report created successfully for {date}"
        }
        
    except Exception as e:
        frappe.log_error(message=str(e), title="Daily Report Generation Error")
        return {
            "status": "error",
            "message": str(e)
        }


@frappe.whitelist()
def get_all_daily_reports():
    """
    Get all Daily Rejection Reports for the Reports page.
    
    Returns:
        list: List of report dictionaries with basic fields
    """
    try:
        # First, let's fetch with minimal fields to avoid field errors
        reports = frappe.get_all(
            "Daily Rejection Report",
            fields=[
                "name",
                "report_date",
                "status",
                "creation",
                "modified"
            ],
            order_by="report_date desc",
            limit=100,
            ignore_permissions=True
        )
        
        frappe.errprint(f"DEBUG: Found {len(reports)} reports")
        
        # For each report, try to get additional details
        result = []
        for report in reports:
            try:
                # Get additional values safely
                # Note: 'pending_cars' might not exist in the doctype based on metadata check
                # We'll default it to 0 for now
                
                total_lots = frappe.db.get_value("Daily Rejection Report", report.name, "lot_total_inspections") or 0
                
                result.append({
                    "name": report.name,
                    "production_date": report.report_date, # Map report_date to production_date for frontend
                    "status": report.status or "Draft",
                    "creation": report.creation,
                    "modified": report.modified,
                    "total_lots": total_lots,
                    "pending_cars": 0 # Default to 0 as field doesn't exist
                })
            except Exception as e:
                # If we can't get detailed info, just use basic report data
                result.append({
                    "name": report.name,
                    "production_date": report.report_date,
                    "status": report.status or "Draft",
                    "creation": report.creation,
                    "modified": report.modified,
                    "total_lots": 0,
                    "pending_cars": 0
                })
        
        return result
        
    except Exception as e:
        frappe.log_error(message=str(e), title="Get All Daily Reports Error")
        # Return empty list instead of throwing to avoid breaking the UI
        return []
@frappe.whitelist()
def get_inspection_rejection_details(inspection_entry_name, inspection_type="Inspection Entry"):
    """
    Get detailed rejection data for a specific inspection entry showing defect breakdown.
    
    Args:
        inspection_entry_name (str): Name of the inspection entry
        inspection_type (str): "Inspection Entry" or "SPP Inspection Entry"
    
    Returns:
        dict: Rejection details with stages and defects
    """
    try:
        # Determine which doctype to query
        if inspection_type == "SPP Inspection Entry" or not frappe.db.exists("Inspection Entry", inspection_entry_name):
            # Try SPP Inspection Entry
            if frappe.db.exists("SPP Inspection Entry", inspection_entry_name):
                return _get_spp_rejection_details(inspection_entry_name)
            else:
                frappe.throw(f"Inspection Entry {inspection_entry_name} not found")
        
        # Get Inspection Entry document
        inspection = frappe.get_doc("Inspection Entry", inspection_entry_name)
        
        result = {
            "inspection_entry": inspection.name,
            "lot_no": inspection.lot_no or "N/A",
            "stages": []
        }
        
        # Group defects by inspection type
        # NOTE: inspection_type is at PARENT level, not in items
        parent_inspection_type = inspection.inspection_type or ""
        parent_total_inspected = int(flt(inspection.total_inspected_qty_nos or 0))
        
        # Fallback: If total_inspected is 0 but we have rejection data, try to calculate
        if parent_total_inspected == 0:
            total_rejected = int(flt(inspection.total_rejected_qty or 0))
            rejection_pct = flt(inspection.total_rejected_qty_in_percentage or 0)
            if total_rejected > 0 and rejection_pct > 0:
                # Calculate: inspected = rejected / (rejection% / 100)
                parent_total_inspected = int(total_rejected / (rejection_pct / 100))
                frappe.log_error(
                    f"Calculated total_inspected ({parent_total_inspected}) from rejected ({total_rejected}) and % ({rejection_pct})",
                    "Inspection Total Fallback"
                )
        
        patrol_defects = []
        line_defects = []
        lot_defects = []
        incoming_defects = []
        
        for item in inspection.items:
            # Try different field names for defect type
            defect_type = None
            for field in ['type_of_defect', 'defect_type', 'defect', 'defect_name']:
                if hasattr(item, field):
                    defect_type = getattr(item, field)
                    break
            
            # Try different field names for rejected qty
            rejected_qty = 0
            for field in ['rejected_qty', 'rejected_quantity', 'qty_rejected', 'rejection_qty']:
                if hasattr(item, field):
                    rejected_qty = int(flt(getattr(item, field) or 0))
                    break
            
            # Skip if no rejection
            if rejected_qty == 0:
                continue
            
            defect = {
                "defect_type": defect_type or "Unknown",
                "rejected_qty": rejected_qty,
                "inspected_qty": parent_total_inspected  # Use parent's total
            }
            
            # Categorize based on PARENT inspection type
            if "incoming" in parent_inspection_type.lower():
                incoming_defects.append(defect)
            elif "patrol" in parent_inspection_type.lower():
                patrol_defects.append(defect)
            elif "line" in parent_inspection_type.lower():
                line_defects.append(defect)
            elif "lot" in parent_inspection_type.lower():
                lot_defects.append(defect)
        
        # Log if no defects found to help debugging
        if not patrol_defects and not line_defects and not lot_defects and not incoming_defects:
            if inspection.items:
                sample_item = inspection.items[0]
                # Just log to console instead of Error Log to avoid character limits
                import json
                print(f"DEBUG: No defects found for {inspection_entry_name}")
                print(f"DEBUG: Parent inspection type: {parent_inspection_type}")
                print(f"DEBUG: Total inspected: {parent_total_inspected}")
                print(f"DEBUG: Sample item has fields: {list(sample_item.as_dict().keys())}")
        
        
        # Build INCOMING stage
        if incoming_defects:
            total_inspected_incoming = parent_total_inspected
            total_rejected_incoming = sum(d['rejected_qty'] for d in incoming_defects)
            rej_pct_incoming = (total_rejected_incoming / total_inspected_incoming * 100) if total_inspected_incoming > 0 else 0
            
            result["stages"].append({
                "stage_name": "INCOMING INSPECTION",
                "total_inspected": total_inspected_incoming,
                "total_rejected": total_rejected_incoming,
                "rejection_percentage": round(rej_pct_incoming, 2),
                "defects": [
                    {
                        "defect_type": d["defect_type"],
                        "rejected_qty": d["rejected_qty"],
                        "percentage": round((d["rejected_qty"] / total_inspected_incoming * 100) if total_inspected_incoming > 0 else 0, 2)
                    }
                    for d in incoming_defects if d["rejected_qty"] > 0
                ]
            })
        
        # Build PATROL stage
        if patrol_defects:
            # Use parent's total instead of summing defects (which duplicates the count)
            total_inspected_patrol = parent_total_inspected
            total_rejected_patrol = sum(d['rejected_qty'] for d in patrol_defects)
            rej_pct_patrol = (total_rejected_patrol / total_inspected_patrol * 100) if total_inspected_patrol > 0 else 0
            
            result["stages"].append({
                "stage_name": "PATROL",
                "total_inspected": total_inspected_patrol,
                "total_rejected": total_rejected_patrol,
                "rejection_percentage": round(rej_pct_patrol, 2),
                "defects": [
                    {
                        "defect_type": d["defect_type"],
                        "rejected_qty": d["rejected_qty"],
                        "percentage": round((d["rejected_qty"] / total_inspected_patrol * 100) if total_inspected_patrol > 0 else 0, 2)
                    }
                    for d in patrol_defects if d["rejected_qty"] > 0
                ]
            })
        
        # Build LINE stage
        if line_defects:
            # Use parent's total instead of summing defects (which duplicates the count)
            total_inspected_line = parent_total_inspected
            total_rejected_line = sum(d['rejected_qty'] for d in line_defects)
            rej_pct_line = (total_rejected_line / total_inspected_line * 100) if total_inspected_line > 0 else 0
            
            result["stages"].append({
                "stage_name": "LINE",
                "total_inspected": total_inspected_line,
                "total_rejected": total_rejected_line,
                "rejection_percentage": round(rej_pct_line, 2),
                "defects": [
                    {
                        "defect_type": d["defect_type"],
                        "rejected_qty": d["rejected_qty"],
                        "percentage": round((d["rejected_qty"] / total_inspected_line * 100) if total_inspected_line > 0 else 0, 2)
                    }
                    for d in line_defects if d["rejected_qty"] > 0
                ]
            })
        
        # Build LOT stage
        if lot_defects:
            # Use parent's total instead of summing defects (which duplicates the count)
            total_inspected_lot = parent_total_inspected
            total_rejected_lot = sum(d['rejected_qty'] for d in lot_defects)
            rej_pct_lot = (total_rejected_lot / total_inspected_lot * 100) if total_inspected_lot > 0 else 0
            
            result["stages"].append({
                "stage_name": "LOT",
                "total_inspected": total_inspected_lot,
                "total_rejected": total_rejected_lot,
                "rejection_percentage": round(rej_pct_lot, 2),
                "defects": [
                    {
                        "defect_type": d["defect_type"],
                        "rejected_qty": d["rejected_qty"],
                        "percentage": round((d["rejected_qty"] / total_inspected_lot * 100) if total_inspected_lot > 0 else 0, 2)
                    }
                    for d in lot_defects if d["rejected_qty"] > 0
                ]
            })
        
        return result
        
    except Exception as e:
        frappe.log_error(f"Error fetching rejection details: {str(e)}", "Get Rejection Details")
        frappe.throw(str(e))


def _get_spp_rejection_details(spp_inspection_entry_name):
    """Get rejection details for SPP (Final) Inspection Entry"""
    try:
        inspection = frappe.get_doc("SPP Inspection Entry", spp_inspection_entry_name)
        
        result = {
            "inspection_entry": inspection.name,
            "lot_no": inspection.lot_no or "N/A",
            "stages": []
        }
        
        # Get parent-level total inspected
        parent_total_inspected = int(flt(inspection.total_inspected_qty_nos or 0))
        
        # Fallback: If total_inspected is 0, try to calculate from rejection data
        if parent_total_inspected == 0:
            total_rejected = int(flt(inspection.total_rejected_qty or 0))
            rejection_pct = flt(inspection.total_rejected_qty_in_percentage or 0)
            if total_rejected > 0 and rejection_pct > 0:
                parent_total_inspected = int(total_rejected / (rejection_pct / 100))
        
        # For SPP, we only have FINAL inspection stage
        final_defects = []
        
        # Try different possible child table names
        child_table = None
        for possible_name in ['items', 'defect_details', 'inspection_details', 'quality_inspection_details']:
            if hasattr(inspection, possible_name) and getattr(inspection, possible_name):
                child_table = getattr(inspection, possible_name)
                frappe.log_error(f"Found child table: {possible_name}", "SPP Child Table Detection")
                break
        
        if child_table:
            for item in child_table:
                # Try different field names for defect type
                defect_type = None
                for field in ['type_of_defect', 'defect_type', 'defect', 'defect_name']:
                    if hasattr(item, field):
                        defect_type = getattr(item, field)
                        break
                
                # Try different field names for rejected qty
                rejected_qty = 0
                for field in ['rejected_qty', 'rejected_quantity', 'qty_rejected', 'rejection_qty']:
                    if hasattr(item, field):
                        rejected_qty = int(flt(getattr(item, field) or 0))
                        break
                
                if rejected_qty > 0:
                    final_defects.append({
                        "defect_type": defect_type or "Unknown",
                        "rejected_qty": rejected_qty
                    })
        else:
            # No child table found, log the document structure
            frappe.log_error(f"No child table found for SPP Entry {spp_inspection_entry_name}. Document fields: {dir(inspection)}", "SPP No Child Table")
        
        if final_defects:
            # Use parent's total instead of summing from defects
            total_inspected = parent_total_inspected
            total_rejected = sum(d['rejected_qty'] for d in final_defects)
            rej_pct = (total_rejected / total_inspected * 100) if total_inspected > 0 else 0
            
            result["stages"].append({
                "stage_name": "FINAL INSPECTION",
                "total_inspected": total_inspected,
                "total_rejected": total_rejected,
                "rejection_percentage": round(rej_pct, 2),
                "defects": [
                    {
                        "defect_type": d["defect_type"],
                        "rejected_qty": d["rejected_qty"],
                        "percentage": round((d["rejected_qty"] / total_inspected * 100) if total_inspected > 0 else 0, 2)
                    }
                    for d in final_defects
                ]
            })
        
        return result
        
    except Exception as e:
        frappe.log_error(f"Error fetching SPP rejection details: {str(e)}", "Get SPP Rejection Details")
        frappe.throw(str(e))


# ============================================================================
# DASHBOARD CHART DATA APIs
# ============================================================================

@frappe.whitelist()
def get_defect_distribution_chart(days=30):
    """Get defect type distribution for pie/bar charts."""
    data = frappe.db.sql("""
        SELECT 
            iei.type_of_defect,
            COUNT(*) as occurrence_count,
            SUM(iei.rejected_qty) as total_rejected_qty
        FROM `tabInspection Entry Item` iei
        INNER JOIN `tabInspection Entry` ie ON ie.name = iei.parent
        WHERE ie.docstatus = 1
        AND ie.posting_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
        AND iei.type_of_defect IS NOT NULL
        AND iei.type_of_defect != ''
        GROUP BY iei.type_of_defect
        ORDER BY total_rejected_qty DESC
        LIMIT 10
    """, (days,), as_dict=True)
    
    total_rejected = sum([flt(d.get("total_rejected_qty", 0)) for d in data])
    results = []
    for row in data:
        rejected_qty = flt(row.get("total_rejected_qty", 0))
        results.append({
            "defect_type": row.get("type_of_defect"),
            "count": int(row.get("occurrence_count", 0)),
            "total_rejected_qty": int(rejected_qty),
            "percentage": round((rejected_qty / total_rejected * 100) if total_rejected > 0 else 0, 2)
        })
    return results


@frappe.whitelist()
def get_rejection_trend_chart(months=6):
    """Get monthly rejection trends by inspection type."""
    data = frappe.db.sql("""
        SELECT 
            DATE_FORMAT(ie.posting_date, '%%Y-%%m') as month,
            DATE_FORMAT(ie.posting_date, '%%b %%Y') as month_label,
            ie.inspection_type,
            COUNT(*) as count,
            AVG(ie.total_rejected_qty_in_percentage) as avg_rejection
        FROM `tabInspection Entry` ie
        WHERE ie.docstatus = 1
        AND ie.posting_date >= DATE_SUB(CURDATE(), INTERVAL %s MONTH)
        AND ie.inspection_type IN ('Patrol Inspection', 'Line Inspection', 'Lot Inspection', 'Incoming Inspection')
        GROUP BY month, month_label, ie.inspection_type
        ORDER BY month DESC, ie.inspection_type
    """, (months,), as_dict=True)
    
    month_data = {}
    for row in data:
        month = row.get("month_label")
        if month not in month_data:
            month_data[month] = {"month": month, "patrol": 0, "line": 0, "lot": 0, "incoming": 0}
        
        if row.get("inspection_type") == "Patrol Inspection":
            month_data[month]["patrol"] = round(flt(row.get("avg_rejection", 0)), 2)
        elif row.get("inspection_type") == "Line Inspection":
            month_data[month]["line"] = round(flt(row.get("avg_rejection", 0)), 2)
        elif row.get("inspection_type") == "Lot Inspection":
            month_data[month]["lot"] = round(flt(row.get("avg_rejection", 0)), 2)
        elif row.get("inspection_type") == "Incoming Inspection":
            month_data[month]["incoming"] = round(flt(row.get("avg_rejection", 0)), 2)
    
    return list(month_data.values())


@frappe.whitelist()
def get_stage_rejection_chart(date=None):
    """Get rejection rates by inspection stage for a specific date."""
    try:
        if not date:
            date = today()
        
        stages_data = []
        stages = [
            {"type": "Patrol Inspection", "name": "Patrol", "color": "#3b82f6"},
            {"type": "Line Inspection", "name": "Line", "color": "#8b5cf6"},
            {"type": "Lot Inspection", "name": "Lot", "color": "#ef4444"},
            {"type": "Incoming Inspection", "name": "Incoming", "color": "#f59e0b"}
        ]
        
        for stage in stages:
            # Simplified query - just use posting_date instead of complex join
            result = frappe.db.sql("""
                SELECT AVG(total_rejected_qty_in_percentage) as avg_rejection
                FROM `tabInspection Entry`
                WHERE inspection_type = %s 
                AND docstatus = 1
                AND DATE(posting_date) = %s
            """, (stage["type"], date), as_dict=True)
            
            avg_rej = flt(result[0].get("avg_rejection", 0)) if result and result[0].get("avg_rejection") else 0
            stages_data.append({
                "stage": stage["name"],
                "rejection_rate": round(avg_rej, 2),
                "color": stage["color"]
            })
        
        return stages_data
    except Exception as e:
        frappe.log_error(f"Error in get_stage_rejection_chart: {str(e)}", "Stage Rejection Chart")
        # Return empty stages so chart doesn't break
        return [
            {"stage": "Patrol", "rejection_rate": 0, "color": "#3b82f6"},
            {"stage": "Line", "rejection_rate": 0, "color": "#8b5cf6"},
            {"stage": "Lot", "rejection_rate": 0, "color": "#ef4444"},
            {"stage": "Incoming", "rejection_rate": 0, "color": "#f59e0b"}
        ]


@frappe.whitelist()
def get_operator_performance_chart(days=30, limit=10):
    """Get operator performance metrics."""
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
        WHERE mpe.docstatus = 1 AND mpe.employee_name IS NOT NULL AND ie.name IS NOT NULL
        AND mpe.moulding_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
        GROUP BY mpe.employee_name HAVING inspection_count > 5
        ORDER BY avg_rejection_pct DESC LIMIT %s
    """, (days, limit), as_dict=True)
    
    results = []
    for row in data:
        results.append({
            "operator_name": row.get("operator_name"),
            "inspection_count": int(row.get("inspection_count", 0)),
            "avg_rejection_pct": round(flt(row.get("avg_rejection_pct", 0)), 2),
            "critical_count": int(row.get("critical_count", 0))
        })
    return results


@frappe.whitelist()
def get_machine_performance_chart(days=30, limit=15):
    """Get machine/press performance metrics."""
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
        AND ie.posting_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
        GROUP BY ie.machine_no HAVING inspection_count > 5
        ORDER BY avg_rejection_pct DESC LIMIT %s
    """, (days,limit), as_dict=True)
    
    results = []
    for row in data:
        results.append({
            "machine_no": row.get("machine_no"),
            "inspection_count": int(row.get("inspection_count", 0)),
            "avg_rejection_pct": round(flt(row.get("avg_rejection_pct", 0)), 2),
            "critical_count": int(row.get("critical_count", 0))
        })
    return results
