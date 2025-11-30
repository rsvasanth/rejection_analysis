// Types for CAR Generation Wizard

export interface LotInspectionRecord {
  inspection_entry: string
  production_date: string
  shift_type: string | null
  operator_name: string
  press_number: string
  item_code: string
  mould_ref: string
  lot_no: string
  patrol_rej_pct: number
  line_rej_pct: number
  lot_rej_pct: number
  exceeds_threshold: boolean
  threshold_percentage: number
}

export interface CARFormData {
  // Auto-filled from inspection
  inspection_entry: string
  lot_no: string
  production_date: string
  operator_name: string
  press_number: string
  item_code: string
  mould_ref: string
  shift_type: string | null
  rejection_percentage: number
  patrol_rej_pct: number
  line_rej_pct: number
  threshold_percentage: number
  
  // Step 1: Problem
  problem_description: string
  
  // Step 2: Root Cause
  cause_for_non_detection: string
  cause_for_occurrence: string
  why_1: string
  why_2: string
  why_3: string
  why_4: string
  why_5: string
  
  // Step 3: Actions
  corrective_action: string
  preventive_measures: string
  
  // Step 4: Assignment
  responsible_person: string
  target_date: string
  
  // Step 5: Review
  remarks: string
}
