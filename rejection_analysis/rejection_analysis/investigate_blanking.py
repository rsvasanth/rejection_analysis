import frappe
import json

def investigate():
    bin_code = 'BLB-00206'
    lots = ['25J08U06']
    
    print(f"Investigating Bin: {bin_code}")
    
    # Get Blanking DC Entries for this bin
    entries = frappe.db.get_all('Blanking DC Entry', 
                               filters={'bin_code': bin_code}, 
                               fields=['name', 'bin_code', 'item_produced', 'item_to_produce', 't_item_to_produce', 'spp_batch_number', 'employee', 'posting_date', 'creation', 'docstatus'], 
                               order_by='creation desc', 
                               limit=10)
    
    print("\nRecent Blanking DC Entries for Bin:")
    print(json.dumps(entries, indent=4, default=str))
    
    # Get MPE for the lot
    mpe = frappe.db.get_value('Moulding Production Entry', 
                             {'scan_lot_number': '25J08U06'}, 
                             ['name', 'moulding_date', 'item_to_produce', 'batch_details', 'creation'], 
                             as_dict=1)
    
    if mpe:
        print("\nMPE Details:")
        print(json.dumps(mpe, indent=4, default=str))
        
        # Test the SQL logic
        item = mpe['item_to_produce']
        moulding_date = mpe['moulding_date']
        
        # We need to parse batch_details to get the spp_batch_number which we use in SQL
        batch_details = json.loads(mpe['batch_details'] or '[]')
        batch_val = ""
        for d in batch_details:
            if d.get('bin') == bin_code:
                batch_val = d.get('spp_batch_number', "")
                break
        
        print(f"\nExtracted Batch No from MPE for this bin: {batch_val}")
        
        blanking_sql = """
            SELECT name, employee, item_produced, item_to_produce, t_item_to_produce, spp_batch_number, posting_date, creation
            FROM `tabBlanking DC Entry`
            WHERE bin_code = %s 
            AND (item_produced = %s OR item_to_produce = %s OR t_item_to_produce = %s OR spp_batch_number = %s)
            AND docstatus = 1
            AND posting_date <= %s
            ORDER BY posting_date DESC, creation DESC LIMIT 1
        """
        res = frappe.db.sql(blanking_sql, (bin_code, item, item, item, batch_val, moulding_date), as_dict=1)
        print("\nSQL Search Result:")
        print(json.dumps(res, indent=4, default=str))
    else:
        print("\nMPE not found for lot 25J08U06")

if __name__ == "__main__":
    investigate()
