import frappe

def check():
    bins = ['BLB -00068', 'BLB -00195', 'BLB -00038', 'BLB -00017', 'BLB -00265']
    item = 'T5045'
    
    print(f"Blanking DC on 2025-11-04 with item_to_produce={item}:")
    for bc in bins:
        r = frappe.db.sql("""
            SELECT bde.name, bde.employee, bdi.item_to_produce 
            FROM `tabBlanking DC Entry` bde 
            JOIN `tabBlanking DC Item` bdi ON bdi.parent = bde.name 
            WHERE bde.posting_date = '2025-11-04' 
            AND bdi.bin_code = %s 
            AND bdi.item_to_produce = %s
            AND bde.docstatus = 1
        """, (bc, item), as_dict=1)
        if r:
            e = frappe.db.get_value('Employee', r[0].employee, 'employee_name')
            print(f"  {bc}: {r[0].name} -> {e}")
        else:
            print(f"  {bc}: NO ENTRY")
