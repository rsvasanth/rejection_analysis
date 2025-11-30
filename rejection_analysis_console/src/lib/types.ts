// Lot Inspection Record Type
export interface InspectionRecord {
  name: string
  date: string
  item: string
  batch_no: string
  quantity: number
  inspector: string
  status: 'Pass' | 'Fail' | 'Pending'
  remarks?: string
}

// Final Inspection Record Type
export interface FinalInspectionRecord {
  name: string
  date: string
  item: string
  lot_no: string
  quantity: number
  inspector: string
  status: 'Approved' | 'Rejected' | 'Hold'
  defects?: string
  remarks?: string
}

// Rejection Record Type
export interface RejectionRecord {
  name: string
  date: string
  item: string
  batch_no: string
  rejected_qty: number
  rejection_reason: string
  department: string
  cost_impact?: number
  remarks?: string
}
