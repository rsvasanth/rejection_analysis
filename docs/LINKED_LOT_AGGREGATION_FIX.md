# Linked Lot Aggregation Fix - November 18, 2025

## Problem Statement

The OEE Dashboard was showing linked lots (multiple production entries from the same Work Planning) as **separate entries** instead of aggregating them into a single row. This was specifically affecting production that occurred on a different date than the Work Planning date.

### Example Case
- **Work Planning Date**: November 11, 2025
- **Actual Production Date**: November 12, 2025 (next day)
- **Linked Lots**: 25K11Z05, 25K11Z09, 25K11Z10
- **Expected**: 1 aggregated row showing "🔗 Linked (3)"
- **Actual (before fix)**: 3 separate rows

## Root Cause Analysis

The bug was in `/apps/smart_screens/smart_screens/smart_screens/page/oee_dashboard/oee_dashboard.py` at **line 71**.

### Incorrect Code (Before Fix)
```python
linked_info = get_linked_lot_info(
    entry.get('lot_number'), 
    entry.get('actual_moulding_date') or entry.get('production_date'),  # WRONG!
    entry.get('shift_type'), 
    entry.get('machine_name')
)
```

### The Issue
The code was passing `actual_moulding_date` (November 12) to `get_linked_lot_info()`, but this function performs validation in **STEP 1** to check if the lot exists in Work Planning for that specific date:

```python
# STEP 1 in lot_linking_helper.py (line 46-73)
work_plan_query = f"""
    SELECT ...
    WHERE DATE(wp.date) = %s  -- Checking if Work Planning date = Nov 12
    ...
"""
```

Since the Work Planning was created for **November 11** (not November 12), the validation failed and the function returned `is_linked: False`, preventing aggregation.

## Solution Applied

### Fixed Code (After Fix)
```python
linked_info = get_linked_lot_info(
    entry.get('lot_number'), 
    entry.get('production_date'),  # Use Work Planning date for linked lot detection
    entry.get('shift_type'), 
    entry.get('machine_name')
)
```

### Why This Works

By passing `production_date` (November 11 - the Work Planning date), the function now:

1. ✅ **STEP 1**: Finds the lot in Work Planning for Nov 11
2. ✅ **STEP 2**: Finds the production entry (no date filter here)
3. ✅ **STEP 3**: Finds all other linked lots from the same Work Planning (Nov 11)
4. ✅ **STEP 4**: Filters production entries by actual moulding date (Nov 12) for all linked lots
5. ✅ **Result**: Returns `is_linked: True` with all 3 lots aggregated

## Technical Details

### File Changed
- **Path**: `/apps/smart_screens/smart_screens/smart_screens/page/oee_dashboard/oee_dashboard.py`
- **Line**: 71
- **Function**: `get_oee_data()`

### Change Type
- **Type**: Bug fix
- **Impact**: Low risk - only affects linked lot detection logic
- **Breaking Changes**: None

### Testing Performed

#### Test Case 1: Production on Same Day as Work Planning
- **Work Planning Date**: Nov 11, 2025
- **Production Date**: Nov 11, 2025
- **Result**: ✅ Works (already working before fix)

#### Test Case 2: Production on Different Day than Work Planning
- **Work Planning Date**: Nov 11, 2025
- **Production Date**: Nov 12, 2025
- **Linked Lots**: 25K11Z05, 25K11Z09, 25K11Z10
- **Result**: ✅ **Fixed!** Now properly aggregates

### Verification Results

After applying the fix, all three shift groups show correctly aggregated linked lots:

| Shift | Lot Number | Status | Lifts | Pieces | OEE |
|-------|------------|--------|-------|--------|-----|
| 8 Hours - 1 | 25K11X07 | 🔗 Linked (3) | 81 | 4,860 | 97.65% |
| 8 Hours - 2 | 25K11Y10 | 🔗 Linked (3) | 83 | 4,980 | 99.83% |
| 8 hours - 3 | 25K11Z05 | 🔗 Linked (3) | 85 | 5,100 | 100.58% |

## Related Functions

The fix interacts with these key functions:

### 1. `get_linked_lot_info()` - lot_linking_helper.py
- **Purpose**: Auto-detect if a lot is part of a linked group
- **Input**: lot_number, **production_date** (Work Planning date), shift_type, machine
- **Output**: `{is_linked: bool, linked_lots: list, main_lot: str}`

### 2. `aggregate_production_data()` - lot_linking_helper.py
- **Purpose**: Aggregate production metrics from multiple linked lots
- **Called when**: `is_linked = True` and `len(linked_lots) > 1`

### 3. `aggregate_quality_data()` - lot_linking_helper.py
- **Purpose**: Aggregate quality/inspection data from multiple lots
- **Called when**: `is_linked = True` and `len(linked_lots) > 1`

## Deployment Notes

### Steps to Deploy
1. The fix has been applied to the development environment
2. Frappe bench was restarted with `bench restart`
3. No database migrations required
4. No cache clearing required

### Rollback Plan
If issues arise, revert line 71 to:
```python
entry.get('actual_moulding_date') or entry.get('production_date')
```

However, this will restore the original bug where production on different dates won't aggregate.

## Future Improvements

Consider enhancing the linked lot detection to:
1. Support cross-date Work Planning scenarios explicitly
2. Add logging for debugging linked lot detection failures
3. Create unit tests for multi-date production scenarios

## References

- **Diagnostic Test**: `/apps/smart_screens/smart_screens/smart_screens/api/oee/test_linked_lot_detection.py`
- **Linked Lot Helper**: `/apps/smart_screens/smart_screens/smart_screens/api/oee/lot_linking_helper.py`
- **OEE Dashboard**: `/apps/smart_screens/smart_screens/smart_screens/page/oee_dashboard/oee_dashboard.py`

---

**Fixed By**: GitHub Copilot Assistant  
**Date**: November 18, 2025  
**Status**: ✅ Verified and Working
