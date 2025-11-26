# -*- coding: utf-8 -*-
# Copyright (c) 2025, Alphaworkz and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now

class CorrectiveActionReport(Document):
	def validate(self):
		self.validate_dates()
		self.update_car_status_in_report()

	def validate_dates(self):
		"""Validate CAR date and target date"""
		if self.car_date > frappe.utils.today():
			frappe.throw(_("CAR date cannot be in the future"))

		if self.target_date and self.target_date < self.car_date:
			frappe.throw(_("Target date cannot be before CAR date"))

	def update_car_status_in_report(self):
		"""Update CAR status in the related Daily Rejection Report"""
		if self.inspection_entry:
			# Find the daily rejection report item that references this inspection entry
			report_items = frappe.get_all(
				"Daily Rejection Report Item",
				filters={"inspection_entry": self.inspection_entry},
				fields=["name", "parent"]
			)

			if report_items:
				# Update the CAR status in the report item
				frappe.db.set_value(
					"Daily Rejection Report Item",
					report_items[0].name,
					"car_status",
					self.status
				)

	def before_submit(self):
		if not self.corrective_action:
			frappe.throw(_("Corrective Action is required before submitting"))

	def on_submit(self):
		# Mark CAR as created in the report
		if self.inspection_entry:
			report_items = frappe.get_all(
				"Daily Rejection Report Item",
				filters={"inspection_entry": self.inspection_entry},
				fields=["name"]
			)

			if report_items:
				frappe.db.set_value(
					"Daily Rejection Report Item",
					report_items[0].name,
					"car_created",
					1
				)

@frappe.whitelist()
def create_car_from_inspection(inspection_entry_name):
	"""Create a CAR from an inspection entry"""

	# Get inspection entry
	inspection = frappe.get_doc("Inspection Entry", inspection_entry_name)

	# Build problem description from defect details
	defects = []
	for item in inspection.items:
		if item.rejected_qty > 0:
			defects.append(f"{item.type_of_defect}: {item.rejected_qty}")

	problem_desc = f"""High rejection ({inspection.total_rejected_qty_in_percentage}%) found in {inspection.inspection_type} for lot {inspection.lot_no}.

Inspected Qty: {inspection.total_inspected_qty_nos}
Rejected Qty: {inspection.total_rejected_qty}
Product: {inspection.product_ref_no}
Inspector: {inspection.inspector_name}
Machine: {inspection.machine_no}
Operator: {inspection.operator_name}

Defects Found:
{chr(10).join(defects)}"""

	# Create CAR
	car = frappe.get_doc({
		"doctype": "Corrective Action Report",
		"car_date": frappe.utils.today(),
		"inspection_entry": inspection_entry_name,
		"lot_no": inspection.lot_no,
		"product_ref_no": inspection.product_ref_no,
		"rejection_percentage": inspection.total_rejected_qty_in_percentage,
		"problem_description": problem_desc,
		"status": "Open"
	})

	car.insert()
	return car

@frappe.whitelist()
def save_five_why_analysis(car_name, why_answers):
	"""Save 5 Why analysis answers"""

	car = frappe.get_doc("Corrective Action Report", car_name)

	# Clear existing analysis
	car.set("five_why_analysis", [])

	# Add new analysis
	for i, answer in enumerate(why_answers, 1):
		car.append("five_why_analysis", {
			f"why_{i}": answer
		})

	car.save()
	return {"status": "success"}