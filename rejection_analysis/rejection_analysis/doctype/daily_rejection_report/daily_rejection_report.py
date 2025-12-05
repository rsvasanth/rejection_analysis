# -*- coding: utf-8 -*-
# Copyright (c) 2025, Alphaworkz and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now, get_datetime

class DailyRejectionReport(Document):
	def before_save(self):
		"""Calculate rejection costs before saving"""
		self.calculate_rejection_costs()
	
	def validate(self):
		self.validate_report_date()
		# No longer calculating summary metrics here - they're pre-calculated by the API

	def before_submit(self):
		self.status = "Generated"

	def validate_report_date(self):
		"""Ensure report date is not in future"""
		if self.report_date > frappe.utils.today():
			frappe.throw(_("Report date cannot be in the future"))
	
	def calculate_rejection_costs(self):
		"""
		Auto-calculate unit_cost and rejection_cost for all child table items.
		Uses remote Item Price API to fetch pricing from Sales site.
		"""
		from rejection_analysis.rejection_analysis.api import fetch_remote_item_prices_batch
		from frappe.utils import flt
		
		# Get remote pricing configuration
		try:
			settings = frappe.get_single("Rejection Analysis Settings")
			remote_url = settings.sales_site_url or ""
			api_key = settings.sales_site_api_key or ""
			api_secret = settings.get_password("sales_site_api_secret") or ""
		except Exception:
			# Fallback to site_config if settings not configured
			remote_url = frappe.conf.get("sales_site_url") or ""
			api_key = frappe.conf.get("sales_site_api_key") or ""
			api_secret = frappe.conf.get("sales_site_api_secret") or ""
		
		if not (remote_url and api_key and api_secret):
			# No pricing configuration - skip cost calculation
			return
		
		# Collect all unique T-item codes from all child tables
		item_codes = set()
		
		# From Incoming Inspection Items
		for item in self.get("incoming_inspection_items", []):
			if item.item:
				item_codes.add(item.item)
		
		# From Final Inspection Items
		for item in self.get("final_inspection_items", []):
			if item.item:
				item_codes.add(item.item)
		
		# From Lot Inspection Items
		for item in self.get("lot_inspection_items", []):
			if item.item_code:
				item_codes.add(item.item_code)
		
		if not item_codes:
			return
		
		# Transform T-items to F-items for pricing lookup
		pricing_item_codes = set()
		item_mapping = {}  # Maps T-item -> F-item
		
		for t_item in item_codes:
			if t_item:
				# Clean up: remove 't.', 'T.', spaces, get first word
				cleaned = str(t_item).strip().replace('t.', '').replace('T.', '').split()[0]
				if cleaned.upper().startswith('T'):
					f_item = 'F' + cleaned[1:]
					pricing_item_codes.add(f_item)
					item_mapping[t_item] = f_item
		
		# Fetch pricing in batch
		pricing_map = fetch_remote_item_prices_batch(
			list(pricing_item_codes),
			remote_url,
			api_key,
			api_secret
		)
		
		# Update costs for Incoming Inspection Items
		for item in self.get("incoming_inspection_items", []):
			if item.item and item.item in item_mapping:
				f_item = item_mapping[item.item]
				unit_cost = pricing_map.get(f_item, 0)
				item.unit_cost = unit_cost
				item.rejection_cost = flt(item.rejected_qty or 0) * unit_cost
		
		# Update costs for Final Inspection Items
		for item in self.get("final_inspection_items", []):
			if item.item and item.item in item_mapping:
				f_item = item_mapping[item.item]
				unit_cost = pricing_map.get(f_item, 0)
				item.unit_cost = unit_cost
				item.fvi_rejection_cost = flt(item.final_rej_qty or 0) * unit_cost
		
		# Update costs for Lot Inspection Items (use actual rejected qty from IE)
		for item in self.get("lot_inspection_items", []):
			if item.item_code and item.item_code in item_mapping:
				f_item = item_mapping[item.item_code]
				unit_cost = pricing_map.get(f_item, 0)
				item.unit_cost = unit_cost
				
				# Use actual rejected_qty from Inspection Entry (already populated during report generation)
				# Don't calculate from percentages - use the real data
				rejected_qty = flt(item.rejected_qty or 0)
				
				# Calculate total cost using actual rejected quantity
				item.total_rejection_cost = rejected_qty * unit_cost
				
				# Note: We keep the stage-wise percentage fields (patrol_rej_pct, line_rej_pct, lot_rej_pct)
				# for display purposes, but don't calculate stage-wise rejected quantities or costs
				# since the business process records total rejected qty, not stage-wise quantities


@frappe.whitelist()
def generate_daily_report(report_date, inspection_type, threshold_percentage=5.0):
	"""
	DEPRECATED: This function is replaced by generate_comprehensive_daily_report in api.py
	
	Generate daily rejection report for specified date and inspection type.
	This is kept for backward compatibility but should not be used for new implementations.
	"""
	frappe.throw(_("This function is deprecated. Use generate_comprehensive_daily_report from api.py instead."))

	# Save and return
	report.insert()
	return report