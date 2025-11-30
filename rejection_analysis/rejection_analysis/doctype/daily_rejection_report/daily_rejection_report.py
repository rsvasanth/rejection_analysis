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
		# No longer calculating summary metrics here - they're pre-calculated by the API

	def before_submit(self):
		self.status = "Generated"

	def validate_report_date(self):
		"""Ensure report date is not in future"""
		if self.report_date > frappe.utils.today():
			frappe.throw(_("Report date cannot be in the future"))

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