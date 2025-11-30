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
		# Only update CAR status if the document already exists (not on first insert)
		if not self.is_new():
			self.update_car_status_in_report()

	def validate_dates(self):
		"""Validate CAR date and target date"""
		from frappe.utils import getdate
		
		# Ensure dates are date objects, not strings - be very defensive
		if self.car_date:
			if isinstance(self.car_date, str):
				self.car_date = getdate(self.car_date)
		
		if self.target_date:
			if isinstance(self.target_date, str):
				self.target_date = getdate(self.target_date)
		
		# Now safely compare dates
		try:
			if self.car_date and self.car_date > frappe.utils.today():
				frappe.throw(_("CAR date cannot be in the future"))

			if self.target_date and self.car_date and self.target_date < self.car_date:
				frappe.throw(_("Target date cannot be before CAR date"))
		except (TypeError, AttributeError) as e:
			# If comparison still fails, convert and retry
			frappe.log_error(f"Date validation error: {str(e)}", "CAR Date Validation")
			self.car_date = getdate(self.car_date) if self.car_date else frappe.utils.today()
			if self.target_date:
				self.target_date = getdate(self.target_date)

	def update_car_status_in_report(self):
		"""Update CAR status in the related Daily Rejection Report"""
		if self.inspection_entry:
			# Check all three child tables for the inspection entry
			# Lot Inspection Report Item
			lot_items = frappe.get_all(
				"Lot Inspection Report Item",
				filters={"inspection_entry": self.inspection_entry},
				fields=["name", "parent"]
			)
			
			if lot_items:
				frappe.db.set_value(
					"Lot Inspection Report Item",
					lot_items[0].name,
					{
						"car_reference": self.name,
						"car_status": self.status
					}
				)
				return
			
			# Incoming Inspection Report Item
			incoming_items = frappe.get_all(
				"Incoming Inspection Report Item",
				filters={"inspection_entry": self.inspection_entry},
				fields=["name", "parent"]
			)
			
			if incoming_items:
				frappe.db.set_value(
					"Incoming Inspection Report Item",
					incoming_items[0].name,
					{
						"car_reference": self.name,
						"car_status": self.status
					}
				)
				return
			
			# Final Inspection Report Item (uses spp_inspection_entry field)
			final_items = frappe.get_all(
				"Final Inspection Report Item",
				filters={"spp_inspection_entry": self.inspection_entry},
				fields=["name", "parent"]
			)
			
			if final_items:
				frappe.db.set_value(
					"Final Inspection Report Item",
					final_items[0].name,
					{
						"car_reference": self.name,
						"car_status": self.status
					}
				)

	def before_submit(self):
		if not self.corrective_action:
			frappe.throw(_("Corrective Action is required before submitting"))

	def on_submit(self):
		# Mark CAR as created in the report (check all three child tables)
		if self.inspection_entry:
			# Lot Inspection Report Item
			lot_items = frappe.get_all(
				"Lot Inspection Report Item",
				filters={"inspection_entry": self.inspection_entry},
				fields=["name"]
			)
			
			if lot_items:
				frappe.db.set_value(
					"Lot Inspection Report Item",
					lot_items[0].name,
					"car_required",
					1
				)
				return
			
			# Incoming Inspection Report Item
			incoming_items = frappe.get_all(
				"Incoming Inspection Report Item",
				filters={"inspection_entry": self.inspection_entry},
				fields=["name"]
			)
			
			if incoming_items:
				frappe.db.set_value(
					"Incoming Inspection Report Item",
					incoming_items[0].name,
					"car_required",
					1
				)
				return
			
			# Final Inspection Report Item
			final_items = frappe.get_all(
				"Final Inspection Report Item",
				filters={"spp_inspection_entry": self.inspection_entry},
				fields=["name"]
			)
			
			if final_items:
				frappe.db.set_value(
					"Final Inspection Report Item",
					final_items[0].name,
					"car_required",
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