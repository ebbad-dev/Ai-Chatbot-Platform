# PrintEZ Official Shipping Methods, Rate Calculations & Tax Policy

This document serves as the authoritative source of truth for PrintEZ shipping options, mathematical rate percentages, minimum carrier fees, and store sales tax calculations. AI Voice Concierge agents and backend checkout services must strictly apply these formulas when computing order estimates.

---

## 1. Free Shipping Threshold (Ground Shipping Only)

* **Official Rule:** **Free Ground Shipping ($0.00) on all orders with an item subtotal of $150.00 or more** (before taxes or promotional discounts).
* **Eligibility:** Automatically replaces standard Ground shipping rates for continental U.S. delivery whenever the cart subtotal reaches or exceeds `$150.00`.
* **AI Concierge Script:** *"Good news! Because your order subtotal is over $150, you qualify for completely free standard Ground shipping!"*

---

## 2. Shipping Rate Calculation Matrix & Percentage Formulas

PrintEZ calculates live shipping delivery fees based on an item subtotal percentage with a mandatory minimum carrier cost. For any given shipping method, the price is calculated as:
$$\text{Shipping Fee} = \max(\text{Minimum Cost}, \text{Subtotal} \times \text{Rate \%})$$

| Shipping Method | Rate (%) of Subtotal | Minimum Cost ($) | Sort Order | Calculation Formula & Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Free Shipping** | **0%** | **$0.00** | 1 | Applicable automatically when Subtotal $\ge$ **$150.00** |
| **Ground** | **17%** | **$11.99** | 2 | Fee is **17% of Subtotal** or **$11.99 minimum** (for orders under $150.00) |
| **Two day** | **65%** | **$55.00** | 3 | Fee is **65% of Subtotal** or **$55.00 minimum** (whichever is greater) |
| **Next day** | **80%** | **$79.99** | 4 | Fee is **80% of Subtotal** or **$79.99 minimum** (whichever is greater) |

### Practical Calculation Examples for AI Agents & Backend Staging

* **Example 1 ($55.99 Order via Ground):**
  * Subtotal is `$55.99` (Under $150 Free Shipping threshold).
  * 17% of $55.99 = $9.52. Because $9.52 is below the minimum carrier cost, **Ground Shipping is capped at the $11.99 minimum**.
  * Estimated Total = $55.99 + $11.99 = **$67.98**.
* **Example 2 ($120.00 Order via Ground):**
  * 17% of $120.00 = $20.40. Because $20.40 exceeds the $11.99 minimum, **Ground Shipping is $20.40**.
  * Estimated Total = $120.00 + $20.40 = **$140.40**.
* **Example 3 ($200.00 Order via Ground vs. Next day):**
  * **If Ground:** Subtotal is over $150, so Ground Shipping is **$0.00 (Free Shipping)**. Total = **$200.00**.
  * **If Next day:** Expedited shipping does not qualify for free promotion. 80% of $200.00 = $160.00. Next day is **$160.00**. Total = **$360.00**.

---

## 3. Store Sales Tax Policy & Percentage Calculation

* **Verified Taxable Nexus State (New York):** For orders shipped to **New York (NY)**, store sales tax is officially calculated at **8.25% (0.0825)** of the item Subtotal.
* **Out-of-State Exemptions:** Orders shipping out-of-state across non-nexus U.S. jurisdictions (such as Ohio, Texas, Florida), or ordered by verified tax-exempt corporate accounts, qualify for **0% ($0.00) sales tax**.
* **Calculation Formula:**
  $$\text{Sales Tax Fee} = \text{Item Subtotal} \times \text{State Tax Rate \%}$$
* **Verified New York Calculation Proof (From OpenCart Admin):**
  * For a **$38.99** order shipped to New York via Ground Shipping:
    * **Sub-Total:** `$38.99`
    * **Shipping:** `$11.99` (Minimum Ground cost applies since 17% is $6.63)
    * **New York Sales Tax (8.25%):** $38.99 x 0.0825 = $3.2166 -> **$3.22**
    * **You Pay (Total):** $38.99 + $11.99 + $3.22 = **$54.20**!
* **AI Concierge Guidance:** If a customer asks about taxes, respond: *"Sales tax is charged on orders shipped to our physical nexus state of New York at 8.25%. If your shipping address is in an exempt out-of-state jurisdiction or if you hold a valid corporate tax exemption certificate, your sales tax will be $0.00 upon checkout!"*

---

## 4. State & City Shipping Availability (Geo Zones & Carrier Rules)

Because standard Ground trucking and expedited Overnight flights cannot physically or financially reach every geographic point in North America identically, OpenCart enforces regional shipping restrictions through **Geo Zones** and carrier limitations:

* **Contiguous 48 Mainland U.S. States:**
  * **Standard Ground:** Supported across all 48 continental states for commercial and residential physical street addresses.
  * **Two day & Next day:** Supported across virtually all metropolitan cities and suburban distribution hubs within the mainland U.S.
* **Non-Contiguous States & Remote Territories (Alaska, Hawaii, Puerto Rico):**
  * **Ground Restrictions:** Standard UPS/FedEx Ground transit is generally disabled for **Alaska (AK)** and **Hawaii (HI)** due to geographic ocean barriers. Orders to AK/HI require expedited delivery (Two day or Next day) or USPS Priority transit.
  * **U.S. Territories & P.O. Boxes / APO / FPO:** Commercial couriers (UPS/FedEx) do not deliver Ground or Overnight packages to P.O. Boxes or Military APO/FPO addresses; these require USPS transit.
* **Rural & Mountain City Restrictions:** In select remote, rural, or high-altitude ZIP codes (even within mainland states like Wyoming, Montana, or Maine), carriers may exclude Guaranteed Next day due to distance from regional flight hubs.
* **Zero Hallucination Rule:** OpenCart dynamically matches customer State and ZIP codes against backend Geo Zones during checkout to present only available delivery options. Never guarantee overnight transit to rural P.O. boxes or overseas territories!

---

## 5. EZ Rewards Program Applicability & Rules

PrintEZ's official loyalty program, **EZ Rewards**, operates under specific eligibility terms across our e-commerce and voice telephony architecture:

* **State & Geographic Applicability:** EZ Rewards is **NOT restricted by U.S. State or city!** Customers across all 50 U.S. states and authorized delivery territories are 100% eligible to participate and redeem rewards.
* **Earning Benefit:** Registered customers automatically earn **3% Cash Back** on every qualifying order placed, which can be applied directly toward future check and printing purchases (rewards expire 90 days after issue).
* **Payment Method Eligibility Requirement (The True Restriction):** EZ Rewards cash back applies exclusively when completing checkout through standard **PrintEZ Account Checkout** (such as credit card processing or invoicing via our automated voice concierge & OpenCart staging system). EZ Rewards are explicitly **NOT applicable** to transactions paid through third-party external checkout portals like PayPal, Amazon Pay, or Google Checkout!

---

## 6. Operating Instructions for AI Voice Concierge

1. **Calculate Accurate Live Quotes:** When reciting estimated pricing to callers, explicitly apply the 17% Ground or $11.99 Minimum formula for orders under $150, or promote $0.00 Free Shipping for orders $150 and above.
2. **Explain Expedited Tiers Clearly:** If a caller requires urgent delivery, quote the Two day (65% or $55 minimum) or Next day (80% or $79.99 minimum) formulas accurately without guessing.
3. **Transparent Tax Guidance:** State clearly that sales tax is charged at 8.25% on New York orders, remaining $0.00 for exempt jurisdictions.
4. **Promote EZ Rewards and Geo Zone Clarity:** Inform callers across all states about earning 3% cash back with standard checkout, while noting that delivery speeds (like Next day to Alaska or rural P.O. boxes) depend on carrier ZIP code availability.
