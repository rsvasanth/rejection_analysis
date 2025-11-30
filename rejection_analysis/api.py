"""
Rejection Analysis Console - API Wrapper
=========================================

This module re-exports all API functions from the nested module to make them
accessible via the standard Frappe API calling convention.

Usage from frontend:
    rejection_analysis.api.get_dashboard_metrics(...)
    rejection_analysis.api.get_lot_inspection_report(...)
    rejection_analysis.api.create_car_from_inspection(...)
"""

# Import all API functions from the nested module
from rejection_analysis.rejection_analysis.api import (
    get_dashboard_metrics,
    get_lot_inspection_report,
    get_incoming_inspection_report,
    get_final_inspection_report,
    get_car_by_inspection,
    update_car,
    create_car_from_inspection,
    get_pending_cars_for_date,
    save_five_why_analysis,
    generate_daily_report,
    generate_comprehensive_daily_report,
    get_all_daily_reports,
    get_inspection_rejection_details,
    # Chart Data APIs
    get_defect_distribution_chart,
    get_rejection_trend_chart,
    get_stage_rejection_chart,
    get_operator_performance_chart,
    get_machine_performance_chart
)

# Re-export all functions (this makes them accessible via rejection_analysis.api.*)
__all__ = [
    'get_dashboard_metrics',
    'get_lot_inspection_report',
    'get_incoming_inspection_report',
    'get_final_inspection_report',
    'get_car_by_inspection',
    'update_car',
    'create_car_from_inspection',
    'get_pending_cars_for_date',
    'save_five_why_analysis',
    'generate_daily_report',
    'generate_comprehensive_daily_report',
    'get_all_daily_reports',
    'get_inspection_rejection_details',
    # Chart Data APIs
    'get_defect_distribution_chart',
    'get_rejection_trend_chart',
    'get_stage_rejection_chart',
    'get_operator_performance_chart',
    'get_machine_performance_chart'
]
