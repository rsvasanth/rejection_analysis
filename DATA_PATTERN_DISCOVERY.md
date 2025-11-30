# Data Pattern Discovery Summary - Rejection Analysis Dashboard

## Date: November 30, 2025

## Executive Summary
Analyzed 103,326 inspection records from July 2023 to November 2025 across Moulding Production Entry, Inspection Entry, and SPP Inspection Entry doctypes to discover meaningful patterns for chart creation.

---

## 📊 Data Inventory

### Total Records by Inspection Type
- **Final Visual Inspection**: 25,597 records
- **Line Inspection**: 24,807 records  
- **Lot Inspection**: 24,183 records
- **Incoming Inspection**: 23,464 records
- **Patrol Inspection**: 5,269 records
- **Visual Inspection**: 6 records (deprecated)

**Total**: 103,326 inspection records
**Date Range**: July 11, 2023 → November 17, 2025

---

## 🔍 Key Patterns Discovered

### 1. Top 10 Defect Types (All Time)
| Defect Type | Occurrences | Total Rejected Qty |
|-------------|-------------|-------------------|
| RIB | 83,912 | 408,584 |
| FLOW-(FL) | 82,420 | 341,601 |
| CUTMARK-(CU) | 82,401 | 188,737 |
| SURFACE DEFECT-(SD) | 82,398 | 301,317 |
| UNDER FILL-(UF) | 82,393 | 284,382 |
| BUBBLE-(BU) / BLISTER-(BL) | 82,397 | 107,172 |
| FOREIGN PARTICLE-(FP) | 82,392 | 67,054 |
| DEFLASH-(DF) | 82,400 | 39,981 |
| OVER CURE-(OC) /FAST CURE | 82,392 | 25,012 |
| DIPRESSION-(DP) | 82,395 | 9,192 |

**Insight**: RIB defects are the #1 contributor to rejections (408K units), followed by FLOW and SURFACE DEFECT.

### 2. Monthly Rejection Trends (Last 6 Months)

| Month | Incoming | Lot | Line | Patrol |
|-------|----------|-----|------|--------|
| Nov 2025 | 7.22% | 4.86% | 3.76% | 2.92% |
| Oct 2025 | 4.92% | 4.87% | 3.68% | 3.68% |
| Sep 2025 | 4.33% | 5.08% | 4.59% | 4.44% |
| Aug 2025 | 6.07% | 5.66% | 4.26% | 4.62% |
| Jul 2025 | 3.90% | 4.96% | 4.13% | 4.02% |
| Jun 2025 | 4.04% | 4.92% | 4.33% | 4.24% |

**Insights**:
- **Incoming Inspection** shows highest variability (3.90% → 7.22%)
- **Lot Inspection** consistently around 4.8-5.1%
- **November 2025** shows spike in Incoming rejections (7.22%)

### 3. Stage Comparison
- **Patrol**: Lowest average (~3-4%) - Early detection phase
- **Line**: Moderate (~3.7-4.6%) - In-process quality
- **Lot**: Higher (~4.9-5.1%) - Post-production inspection
- **Incoming**: Highest variability (~4-7%) - Vendor quality issues

---

## 📈 Recommended Charts

### Chart 1: **Defect Distribution Pie Chart** ✅ IMPLEMENTED
- **API**: `get_defect_distribution_chart(days=30)`
- **Data**: Top 10 defect types with percentages
- **Use Case**: Identify primary quality issues

### Chart 2: **Rejection Trend Line Chart** ✅ IMPLEMENTED
- **API**: `get_rejection_trend_chart(months=6)`
- **Data**: Monthly trends for all 4 inspection stages
- **Use Case**: Track quality improvement over time

### Chart 3: **Stage Rejection Bar Chart** ✅ IMPLEMENTED
- **API**: `get_stage_rejection_chart(date)`
- **Data**: Compare rejection rates across Patrol → Line → Lot → Incoming
- **Use Case**: Identify which stage has highest rejections

### Chart 4: **Operator Performance** ✅ IMPLEMENTED
- **API**: `get_operator_performance_chart(days=30, limit=10)`
- **Data**: Top operators by rejection rate with critical count
- **Use Case**: Training and performance management

### Chart 5: **Machine Performance** ✅ IMPLEMENTED
- **API**: `get_machine_performance_chart(days=30, limit=15)`
- **Data**: Press/machine rejection rates
- **Use Case**: Maintenance prioritization

---

## 🛠 API Endpoints Created

All endpoints added to `/rejection_analysis/rejection_analysis/api.py`:

```python
@frappe.whitelist()
def get_defect_distribution_chart(days=30)
    # Returns top 10 defects with counts and percentages

@frappe.whitelist()
def get_rejection_trend_chart(months=6)
    # Returns monthly trends by inspection type

@frappe.whitelist()
def get_stage_rejection_chart(date=None)
    # Returns rejection rates by stage for specific date

@frappe.whitelist()
def get_operator_performance_chart(days=30, limit=10)
    # Returns operator performance metrics

@frappe.whitelist()
def get_machine_performance_chart(days=30, limit=15)
    # Returns machine/press performance metrics
```

---

## 💡 Insights for Dashboard Design

### Critical Metrics to Display:
1. **Real-time defect distribution** (update daily)
2. **Month-over-month trends** (6-month rolling window)
3. **Operator leaderboard** (bottom performers for training)
4. **Machine hotspots** (maintenance alerts for high-rejection presses)
5. **Stage efficiency** (where most rejections occur)

### Alert Thresholds:
- **Critical**: > 5.0% rejection rate
- **Warning**: 3.0-5.0% rejection rate
- **Normal**: < 3.0% rejection rate

### Recommended Visualizations:
- **Pie Chart**: Defect distribution
- **Multi-line Chart**: Monthly trends by stage
- **Bar Chart**: Stage comparison & operator performance
- **Heat Map**: Machine performance matrix

---

## 🎯 Next Steps

1. ✅ API endpoints created
2. ⏳ Update Dashboard.tsx to fetch chart data
3. ⏳ Create React components for each chart
4. ⏳ Add date range selectors
5. ⏳ Implement real-time data refresh

---

## Files Modified

- `/rejection_analysis/rejection_analysis/api.py` - Added 5 chart data endpoints
- `/rejection_analysis/rejection_analysis/data_discovery.py` - Analysis script (reference)

## Cache Cleared
- Site: `spp15.local`
- Status: Ready for testing
