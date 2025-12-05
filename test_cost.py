import frappe
from frappe.utils import flt

doc = frappe.get_last_doc('Daily Rejection Report')
print(f'Report: {doc.name}, Date: {doc.report_date}')
print(f'Lot items: {len(doc.lot_inspection_items)}')

if doc.lot_inspection_items:
    item = doc.lot_inspection_items[0]
    print(f'\nItem: {item.item_code}')
    print(f'IE: {item.inspection_entry}')
    print(f'Inspected Qty (child table): {item.inspected_qty}')
    print(f'Unit Cost: {item.unit_cost}')
    
    if item.inspection_entry:
        inspected = frappe.db.get_value('Inspection Entry', item.inspection_entry, 'total_inspected_qty_nos')
        print(f'Inspected Qty (IE): {inspected}')
        
        if inspected:
            print(f'Lot %: {item.lot_rej_pct}%')
            rejected = flt(inspected) * flt(item.lot_rej_pct) / 100
            cost = rejected * flt(item.unit_cost)
            print(f'Should be: {rejected:.0f} rejected × ₹{item.unit_cost:.2f} = ₹{cost:.2f}')
