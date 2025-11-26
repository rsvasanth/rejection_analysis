# -*- coding: utf-8 -*-
# Copyright (c) 2025, Alphaworkz and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.model.document import Document

class RejectionThresholdConfiguration(Document):
	def validate(self):
		self.validate_thresholds()
		self.validate_uniqueness()

	def validate_thresholds(self):
		"""Validate threshold values"""
		if self.warning_threshold and self.threshold_percentage:
			if self.warning_threshold >= self.threshold_percentage:
				frappe.throw(_("Warning threshold must be less than main threshold"))

		if self.critical_threshold and self.threshold_percentage:
			if self.critical_threshold <= self.threshold_percentage:
				frappe.throw(_("Critical threshold must be greater than main threshold"))

		if self.warning_threshold and self.critical_threshold:
			if self.warning_threshold >= self.critical_threshold:
				frappe.throw(_("Warning threshold must be less than critical threshold"))

	def validate_uniqueness(self):
		"""Ensure unique configuration for inspection type + product/item group combination"""
		filters = {
			"inspection_type": self.inspection_type,
			"is_active": 1,
			"name": ["!=", self.name] if self.name else []
		}

		# Check for product-specific config
		if self.product_ref_no:
			filters["product_ref_no"] = self.product_ref_no
		# Check for item group config
		elif self.item_group:
			filters["item_group"] = self.item_group
		# Check for global config (no product/item group)
		else:
			filters["product_ref_no"] = ["is", "not set"]
			filters["item_group"] = ["is", "not set"]

		existing = frappe.get_all(
			"Rejection Threshold Configuration",
			filters=filters,
			fields=["name"]
		)

		if existing:
			frappe.throw(_("Configuration already exists for this inspection type and product/item group combination"))

@frappe.whitelist()
def get_threshold_for_inspection_type(inspection_type, product_ref_no=None, item_group=None):
	"""Get threshold percentage for inspection type, considering product/item group hierarchy"""

	# Priority: Product specific > Item Group > Global default
	filters = {
		"inspection_type": inspection_type,
		"is_active": 1
	}

	# Try product-specific first
	if product_ref_no:
		product_config = frappe.get_all(
			"Rejection Threshold Configuration",
			filters={**filters, "product_ref_no": product_ref_no},
			fields=["threshold_percentage", "warning_threshold", "critical_threshold"]
		)
		if product_config:
			return product_config[0]

	# Try item group
	if item_group:
		group_config = frappe.get_all(
			"Rejection Threshold Configuration",
			filters={**filters, "item_group": item_group},
			fields=["threshold_percentage", "warning_threshold", "critical_threshold"]
		)
		if group_config:
			return group_config[0]

	# Try global default (no product/item group specified)
	global_config = frappe.get_all(
		"Rejection Threshold Configuration",
		filters={
			**filters,
			"product_ref_no": ["is", "not set"],
			"item_group": ["is", "not set"]
		},
		fields=["threshold_percentage", "warning_threshold", "critical_threshold"]
	)

	if global_config:
		return global_config[0]

	# Return default values if no configuration found
	return {
		"threshold_percentage": 5.0,
		"warning_threshold": 3.0,
		"critical_threshold": 10.0
	}