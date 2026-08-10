# PrintEZ Official Shipping Methods, Rate Calculations & Tax Policy

This document serves as the authoritative source of truth for PrintEZ shipping options, mathematical rate percentages, minimum carrier fees, and store sales tax calculations. AI Voice Concierge agents and backend checkout services must strictly apply these formulas when computing order estimates.

---

## 1. Free Shipping Threshold (Ground Shipping Only)

* **Official Rule:** **Free Ground Shipping ($0.00) on all orders with an item subtotal of $150 or more.**
* **Exceptions:** Next-Day and Two-Day shipping options do not qualify for free shipping.

## 2. Shipping Rate Calculations (Subtotal under $150, or Expedited)

If an order does not qualify for free shipping (subtotal < $150), or if the customer chooses an expedited method regardless of subtotal, calculate shipping based on these exact percentage formulas. **Important:** Compare the percentage calculation against the minimum carrier fee and use the **greater** of the two.

### A. Ground Shipping
* **Rate:** 17% of item subtotal.
* **Minimum Fee:** $11.99
* **Formula:** `MAX( (Subtotal * 0.17), 11.99 )`

### B. Two-Day Shipping
* **Rate:** 65% of item subtotal.
* **Minimum Fee:** $55.00
* **Formula:** `MAX( (Subtotal * 0.65), 55.00 )`

### C. Next-Day Shipping
* **Rate:** 80% of item subtotal.
* **Minimum Fee:** $79.99
* **Formula:** `MAX( (Subtotal * 0.80), 79.99 )`

## 3. Store Sales Tax Policy

* **New York State Addresses ONLY:**
  * **Rate:** 8.25%
  * **Taxable Base:** New York State law requires sales tax to be calculated on the **Gross Order Total** (Item Subtotal + Shipping Cost).
  * **Formula:** `Tax = (Subtotal + Shipping Cost) * 0.0825`
* **All Other US States:** No Sales Tax collected.
