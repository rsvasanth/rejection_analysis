# -*- coding: utf-8 -*-
# Copyright (c) 2025, Alphaworkz and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now, get_datetime

class DailyRejectionReport(Document):
	def validate(self):
		self.validate_report_date()
		self.calculate_summary_metrics()

	def before_submit(self):
		self.status = "Reviewed"
		self.reviewed_on = now()
		self.reviewed_by = frappe.session.user

	def validate_report_date(self):
		"""Ensure report date is not in future"""
		if self.report_date > frappe.utils.today():
			frappe.throw(_("Report date cannot be in the future"))

	def calculate_summary_metrics(self):
		"""Calculate summary metrics from inspection entries"""
		if not self.inspection_entries:
			return

		total_inspections = len(self.inspection_entries)
		total_inspected = sum([entry.get("inspected_qty", 0) for entry in self.inspection_entries])
		total_rejected = sum([entry.get("rejected_qty", 0) for entry in self.inspection_entries])

		# Calculate average rejection percentage
		avg_rejection = 0
		if total_inspected > 0:
			avg_rejection = (total_rejected / total_inspected) * 100

		# Count lots exceeding threshold
		threshold = self.threshold_percentage or 5.0
		exceeding_count = len([
			entry for entry in self.inspection_entries
			if entry.get("rejection_percentage", 0) > threshold
		])

		# Update fields
		self.total_inspections = total_inspections
		self.total_inspected_qty = total_inspected
		self.total_rejected_qty = total_rejected
		self.average_rejection_percentage = round(avg_rejection, 2)
		self.lots_exceeding_threshold = exceeding_count

@frappe.whitelist()
def generate_daily_report(report_date, inspection_type, threshold_percentage=5.0):
	"""Generate daily rejection report for specified date and inspection type"""

	# Check if report already exists
	existing = frappe.get_all(
		"Daily Rejection Report",
		filters={
			"report_date": report_date,
			"inspection_type": inspection_type,
			"docstatus": ["!=", 2]  # Not cancelled
		}
	)

	if existing:
		frappe.throw(_("Report already exists for {0} - {1}").format(report_date, inspection_type))

	# Get inspection entries for the date
	inspections = frappe.get_all(
		"Inspection Entry",
		filters={
			"posting_date": report_date,
			"inspection_type": inspection_type,
			"docstatus": 1
		},
		fields=[
			"name", "lot_no", "product_ref_no", "inspector_code", "inspector_name",
			"operator_name", "machine_no", "total_inspected_qty_nos",
			"total_rejected_qty", "total_rejected_qty_in_percentage"
		]
	)

	if not inspections:
		frappe.throw(_("No inspection entries found for {0} - {1}").format(report_date, inspection_type))

	# Create report document
	report = frappe.get_doc({
		"doctype": "Daily Rejection Report",
		"report_date": report_date,
		"inspection_type": inspection_type,
		"threshold_percentage": threshold_percentage,
		"status": "Generated",
		"generated_on": now(),
		"generated_by": frappe.session.user
	})

	# Add inspection entries
	for insp in inspections:
		exceeds_threshold = insp.total_rejected_qty_in_percentage > threshold_percentage

		report.append("inspection_entries", {
			"inspection_entry": insp.name,
			"lot_no": insp.lot_no,
			"product_ref_no": insp.product_ref_no,
			"inspector_code": insp.inspector_code,
			"inspector_name": insp.inspector_name,
			"operator_name": insp.operator_name,
			"machine_no": insp.machine_no,
			"inspected_qty": insp.total_inspected_qty_nos,
			"rejected_qty": insp.total_rejected_qty,
			"rejection_percentage": insp.total_rejected_qty_in_percentage,
			"exceeds_threshold": exceeds_threshold,
			"car_required": exceeds_threshold
		})

	# Calculate summary metrics
	report.calculate_summary_metrics()

	# Save and return
	report.insert()
	return report