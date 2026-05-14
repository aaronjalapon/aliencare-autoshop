# AlienCare AutoShop -- Improvement Recommendations for FrontDesk Side Only

This document outlines suggested improvements organized by module. Each item describes what should be built or changed, with a brief example or explanation.

---

## Services

### 1. Service-to-Items Package Linking

**Proposed:** Add a UI in the Services section that allows adding items to a service. When a service is selected on a job order, the linked parts are automatically added to the job order items. If the customer wants different or additional parts, they request the front desk to modify the items.

*Example: An "Oil Change" service automatically adds 1 oil filter and 4 liters of engine oil to the job order. The front desk only needs to select the service -- the parts come with it.*

---

## Job Orders

### 2. Dedicated Mechanic & Bay Assignment Tab

**Proposed:** Add a separate tab specifically for mechanic and bay assignment. Assignment should only happen when the vehicle's scheduled service time is approaching, not at job order creation. This gives the front desk visibility into upcoming workload distribution.

*Why: Assigning a mechanic and bay at creation time wastes capacity -- the bay sits reserved but unused while the vehicle hasn't arrived yet. A dedicated assignment view also helps the front desk see at a glance who is free and who is overloaded.*

### 3. Job Order Item Editing UI

**Proposed:** Add item-level editing to the job order detail view -- ability to add items, remove items, and change quantities of parts/services within an existing job order.

*Example: A mechanic discovers during service that a brake pad set also needs replacement. The front desk opens the job order, adds "Brake Pad Set" as a new item, and updates the estimate -- without canceling and recreating the entire job order.*

### 4. Online Booking Approval Flow

**Proposed:** Add a "For Approval" section that lists online bookings with unsecured or unconfirmed payments . These should appear at the top of the list so staff can review and approve or reject them before they enter the active queue.

*Why: An online booking where the customer hasn't paid yet shouldn't block a time slot from a paying walk-in customer. The approval step lets staff confirm payment or contact the customer before committing shop resources.*

### 5. Active Queue View

**Proposed:** In the active queue view it should organizes vehicles by their current service stage and scheduled time:
- Walk-in customers appear directly in the queue when it is their scheduled time.
- Online bookings appear in the queue when their reserved time slot arrives.
- Reserved vehicles for specific time slots are automatically added to the queue.
- Each entry in the active queue has a "Proceed to Payment" button for when the service is complete.

*This replaces the flat job order table with a time-ordered queue that reflects the actual shop floor -- staff can see who is next, who is in progress, and who is ready for payment without filtering or searching.*

### 6. Billing and Paid Tabs

**Proposed:** Replace the filter pills with dedicated "Billing" and "Paid" tabs. The Billing tab shows only pending and partial transactions (no action buttons, status indicators only) this will only move to the paid tab if the bills have been setteled. The Paid tab shows completed/paid transactions (read-only view).

*Why: Separating unpaid from paid into tabs reduces clutter. Staff working on collections don't need to see already-settled transactions mixed in.*

---

## Point of Sale (POS)

### 7. Remove Inline Edit & Delete from POS Transactions

**Proposed:** Remove the edit and delete buttons from the POS interface specifically in every Item.
 Once a transaction is recorded, it should be final. Corrections are handled by voiding the transaction (which creates a reversal record) or processing a refund -- both of which leave a proper audit trail.

*Example: Instead of editing a line item's price after checkout, the cashier voids the transaction and rings up a new one. The void appears in reports with the cashier's name, timestamp, and reason.*

### 8. Make Customer Optional for Parts-Only Walk-Ins

**Proposed:** Make the customer field optional for walk-in purchases where the customer is only buying parts (no service). If the customer is getting a repair or service, then the customer field becomes required.

*Example: A person walks in to buy a bottle of coolant and pay cash. The cashier rings it up on POS without creating a customer profile. If that same person also wants an oil change, the system prompts for customer details before the service can be added.*

### 9. Payment Method UIs (Cash, QR Code, Bank Transfer)

**Proposed:** Add payment-method-specific UIs to the POS checkout flow:
- **Cash:** An input field for the cash amount tendered, with automatic change calculation (e.g., total is PHP 1,250, customer pays PHP 1,500 -- system displays "Change: PHP 250").
- **QR Code:** Display a QR code image for online payments, that the customer scans with their phone.  As well as card payment.

---

## Billing & Payment

### 10. Payment Amount Entry & Multi-Method Support

**Proposed:** Add proper payment input UIs for the billing page:
- Cash payments with amount tendered and change calculation.
- Online payment processing (GCash, Maya, card via Xendit) -- generate a payment link or QR code.

*This is the billing-side counterpart of item #9. While item #9 handles the POS checkout moment, this handles payments against existing invoices and job orders.*

### 11. Side Panel Instead of Modal for Payment

**Proposed:** Replace the payment modal with a side panel that slides in from the right. A side panel provides more vertical space for payment details, keeps the billing list visible in the background, and feels less disruptive than a modal for multi-step flows like selecting payment method -> entering amount -> confirming.

### 12. Multi-Channel Payment Visibility (Front Desk & Customer)

**Proposed:** 


*This gives the customer flexibility while keeping the front desk informed of all payment activity. Both sides see the same invoice status, so there is no confusion about whether a bill has been settled.*

---

## Inventory

### 13. Review of the Reservations Module

**Proposed:** Consider removing the standalone Reservations tab from inventory. If services are packaged with their required items (see item #1), parts can be auto-reserved when a service is selected on a job order. Keep manual reservations available as a fallback for special cases (e.g., holding a rare part for a specific customer before a job order is created).

*The goal is to reduce manual data entry -- most reservations should happen automatically as a byproduct of creating a job order, not as a separate step in a different tab.*

---

## UI/UX -- Navigation & Workflow

### 14. Navigation Badge Counts

**Proposed:** Show pending action counts as small badge numbers on sidebar navigation items. Examples: unpaid invoices count on Billing, pending reservations on Reservations, low stock items on Inventory, unapproved bookings on Job Orders. The badge updates in real time or on a short polling interval.

*This lets staff see what needs attention immediately upon logging in, without clicking into each section to check.*

### 15. Global Quick Search (Ctrl+K)

**Proposed:** Add a global search bar accessible via Ctrl+K (or a search icon in the header). Typing searches across customers (name, phone, plate number), inventory (SKU, item name), and job orders (JO number). Results appear in a dropdown grouped by type (Customers / Inventory / Job Orders). Selecting a result navigates directly to that record.

*Example: Staff types "ABC-1234" (a plate number) and immediately sees the vehicle, its owner, and their active job orders -- all from one search.*

### 16. Job Order Visual Progress Tracker

**Proposed:** Each job order row should display a compact visual progress indicator -- a series of connected steps or dots representing the lifecycle (Created → Approved → In Progress → Completed → Settled) with the current stage highlighted and completed stages filled. This gives staff instant status recognition without reading text.

*Think of it like a package tracking bar -- you see at a glance how far along the job is.*

---

## UI/UX -- Customer-Facing

### 17. Customer Vehicle Service History Timeline

**Proposed:** When viewing a customer or their vehicle, display a chronological timeline of all past services. Each entry shows the date, service performed, parts used, mechanic assigned, and total cost.

*Example: A customer comes in with a suspension issue. The front desk opens their profile and sees the timeline: "Mar 2025 -- Shock Absorber Replacement (Front), PHP 8,500" and "Jan 2025 -- Wheel Alignment, PHP 1,200." This gives immediate context and helps staff make relevant recommendations.*

---

## UI/UX -- Operations

### 18. Print-Ready Invoice & Job Order Layouts

**Proposed:** Add a print button and print-specific CSS (`@media print`) on invoices and job order detail views. The print layout hides navigation, buttons, and sidebars, and formats the content cleanly on paper. Auto shops routinely hand printed documents to customers as official receipts and work orders.

### 19. Bulk Actions on Data Tables

**Proposed:** Add checkbox selection and a bulk action toolbar to inventory, reservations, and billing tables. The toolbar appears when at least one row is selected. Supported actions:
- Inventory: bulk update stock, bulk export.
- Reservations: bulk approve, bulk reject.
- Billing: bulk mark as paid, bulk export.

*Example: At the end of the day, the front desk selects 15 completed reservations and clicks "Bulk Approve" instead of opening each one individually.*

### 20. Price Override with Required Reason

**Proposed:** Allow staff to override unit prices on POS and job order items, but require selecting a reason from a dropdown (e.g., damaged packaging, loyal customer discount, price match, manager approval). The original price, new price, reason, and staff member are logged to the audit trail.

*Why: Price adjustments happen in real shops, but without a required reason and audit log, it's impossible to tell whether a discount was legitimate or an error. The reason field creates accountability.*

---

## UI/UX -- Shop Floor

### 21. Photo Attachments on Job Orders

**Proposed:** Let mechanics and staff upload photos directly to a job order from a phone or tablet. Photos are stored alongside the job order and visible to both staff and the customer.

*Example: A mechanic takes a photo of a cracked brake rotor before replacing it. The customer sees the photo on their billing page and understands exactly why the replacement was needed -- reducing disputes and building trust.*

### 22. Calendar/Schedule View for Job Orders

**Proposed:** Add a day/week calendar view as an alternative to the job order list. The calendar shows booked time slots with customer name and service type, assigned bays (color-coded by availability), and mechanic assignments.

*Why: A list is good for searching and filtering, but a calendar is the natural way to answer "Do we have room for a walk-in at 2 PM?" Staff can drag an unscheduled job order into an open slot to book it.*

# AlienCare AutoShop -- Improvement Recommendations

This document outlines suggested improvements organized by module. Each item describes what should be built or changed, with a brief example or explanation.

---

## Services

### 1. Service-to-Items Package Linking

**Proposed:** Add a UI in the Services section that allows linking inventory items to a service as a "package." When a service is selected on a job order, the linked parts are automatically added to the job order items. If the customer wants different or additional parts, they request the front desk to modify the items.

*Example: An "Oil Change" service automatically adds 1 oil filter and 4 liters of engine oil to the job order. The front desk only needs to select the service -- the parts come with it.*

---

## Job Orders

### 2. Dedicated Mechanic & Bay Assignment Tab

**Proposed:** Add a separate tab or queue view specifically for mechanic and bay assignment. Assignment should only happen when the vehicle's scheduled service time is approaching, not at job order creation. This gives the front desk visibility into upcoming workload distribution.

*Why: Assigning a mechanic and bay at creation time wastes capacity -- the bay sits reserved but unused while the vehicle hasn't arrived yet. A dedicated assignment view also helps the front desk see at a glance who is free and who is overloaded.*

### 3. Job Order Item Editing UI

**Proposed:** Add item-level editing to the job order detail view -- ability to add items, remove items, and change quantities of parts/services within an existing job order.

*Example: A mechanic discovers during service that a brake pad set also needs replacement. The front desk opens the job order, adds "Brake Pad Set" as a new item, and updates the estimate -- without canceling and recreating the entire job order.*

### 4. Online Booking Approval Flow

**Proposed:** Add a "For Approval" section that lists online bookings with unsecured or unconfirmed payments. These should appear at the top of the list so staff can review and approve or reject them before they enter the active queue.

*Why: An online booking where the customer hasn't paid yet shouldn't block a time slot from a paying walk-in customer. The approval step lets staff confirm payment or contact the customer before committing shop resources.*

### 5. Active Queue View

**Proposed:** Create an active queue view that organizes vehicles by their current service stage and scheduled time:
- Walk-in customers appear directly in the queue when it is their scheduled time.
- Online bookings appear in the queue when their reserved time slot arrives.
- Reserved vehicles for specific time slots are automatically added to the queue.
- Each entry in the active queue has a "Proceed to Payment" button for when the service is complete.

*This replaces the flat job order table with a time-ordered queue that reflects the actual shop floor -- staff can see who is next, who is in progress, and who is ready for payment without filtering or searching.*

### 6. Billing and Paid Tabs

**Proposed:** Replace the filter pills with dedicated "Billing" and "Paid" tabs. The Billing tab shows only pending and partial transactions (no action buttons, status indicators only). The Paid tab shows completed/paid transactions (read-only view).

*Why: Separating unpaid from paid into tabs reduces clutter. Staff working on collections don't need to see already-settled transactions mixed in.*

---

## Point of Sale (POS)

### 7. Remove Inline Edit & Delete from POS Transactions

**Proposed:** Remove the edit and delete buttons from the POS interface. Once a transaction is recorded, it should be final. Corrections are handled by voiding the transaction (which creates a reversal record) or processing a refund -- both of which leave a proper audit trail.

*Example: Instead of editing a line item's price after checkout, the cashier voids the transaction and rings up a new one. The void appears in reports with the cashier's name, timestamp, and reason.*

### 8. Make Customer Optional for Parts-Only Walk-Ins

**Proposed:** Make the customer field optional for walk-in purchases where the customer is only buying parts (no service). If the customer is getting a repair or service, then the customer field becomes required.

*Example: A person walks in to buy a bottle of coolant and pay cash. The cashier rings it up on POS without creating a customer profile. If that same person also wants an oil change, the system prompts for customer details before the service can be added.*

### 9. Payment Method UIs (Cash, QR Code, Bank Transfer)

**Proposed:** Add payment-method-specific UIs to the POS checkout flow:
- **Cash:** An input field for the cash amount tendered, with automatic change calculation (e.g., total is PHP 1,250, customer pays PHP 1,500 -- system displays "Change: PHP 250").
- **QR Code:** Display a QR code image for GCash and Maya payments that the customer scans with their phone.
- **Bank Transfer:** Show bank account details and a reference number field for the customer to input their transfer reference.

---

## Billing & Payment

### 10. Payment Amount Entry & Multi-Method Support

**Proposed:** Add proper payment input UIs for the billing page:
- Cash payments with amount tendered and change calculation.
- Online payment processing (GCash, Maya, card via Xendit) -- generate a payment link or QR code.
- Bank transfer with reference number field and account details display.

*This is the billing-side counterpart of item #9. While item #9 handles the POS checkout moment, this handles payments against existing invoices and job orders.*

### 11. Side Panel Instead of Modal for Payment

**Proposed:** Replace the payment modal with a side panel that slides in from the right. A side panel provides more vertical space for payment details, keeps the billing list visible in the background, and feels less disruptive than a modal for multi-step flows like selecting payment method -> entering amount -> confirming.

### 12. Multi-Channel Payment Visibility (Front Desk & Customer)

**Proposed:** When a job order is marked "ready for payment," make it visible in both the front desk billing page and the customer's billing page. The customer can choose to:
- Pay online (via Xendit -- GCash, Maya, card).
- Pay via bank transfer.
- Pay in person at the front desk (cash or card).

*This gives the customer flexibility while keeping the front desk informed of all payment activity. Both sides see the same invoice status, so there is no confusion about whether a bill has been settled.*

---

## Inventory

### 13. Review of the Reservations Module

**Proposed:** Consider removing the standalone Reservations tab from inventory. If services are packaged with their required items (see item #1), parts can be auto-reserved when a service is selected on a job order. Keep manual reservations available as a fallback for special cases (e.g., holding a rare part for a specific customer before a job order is created).

*The goal is to reduce manual data entry -- most reservations should happen automatically as a byproduct of creating a job order, not as a separate step in a different tab.*

---

## UI/UX -- Navigation & Workflow

### 14. Navigation Badge Counts

**Proposed:** Show pending action counts as small badge numbers on sidebar navigation items. Examples: unpaid invoices count on Billing, pending reservations on Reservations, low stock items on Inventory, unapproved bookings on Job Orders. The badge updates in real time or on a short polling interval.

*This lets staff see what needs attention immediately upon logging in, without clicking into each section to check.*

### 15. Global Quick Search (Ctrl+K)

**Proposed:** Add a global search bar accessible via Ctrl+K (or a search icon in the header). Typing searches across customers (name, phone, plate number), inventory (SKU, item name), and job orders (JO number). Results appear in a dropdown grouped by type (Customers / Inventory / Job Orders). Selecting a result navigates directly to that record.

*Example: Staff types "ABC-1234" (a plate number) and immediately sees the vehicle, its owner, and their active job orders -- all from one search.*

### 16. Job Order Visual Progress Tracker

**Proposed:** Each job order row should display a compact visual progress indicator -- a series of connected steps or dots representing the lifecycle (Created → Approved → In Progress → Completed → Settled) with the current stage highlighted and completed stages filled. This gives staff instant status recognition without reading text.

*Think of it like a package tracking bar -- you see at a glance how far along the job is.*

---

## UI/UX -- Customer-Facing

### 17. Customer Vehicle Service History Timeline

**Proposed:** When viewing a customer or their vehicle, display a chronological timeline of all past services. Each entry shows the date, service performed, parts used, mechanic assigned, and total cost.

*Example: A customer comes in with a suspension issue. The front desk opens their profile and sees the timeline: "Mar 2025 -- Shock Absorber Replacement (Front), PHP 8,500" and "Jan 2025 -- Wheel Alignment, PHP 1,200." This gives immediate context and helps staff make relevant recommendations.*

---

## UI/UX -- Operations

### 18. Print-Ready Invoice & Job Order Layouts

**Proposed:** Add a print button and print-specific CSS (`@media print`) on invoices and job order detail views. The print layout hides navigation, buttons, and sidebars, and formats the content cleanly on paper. Auto shops routinely hand printed documents to customers as official receipts and work orders.

### 19. Bulk Actions on Data Tables

**Proposed:** Add checkbox selection and a bulk action toolbar to inventory, reservations, and billing tables. The toolbar appears when at least one row is selected. Supported actions:
- Inventory: bulk update stock, bulk export.
- Reservations: bulk approve, bulk reject.
- Billing: bulk mark as paid, bulk export.

*Example: At the end of the day, the front desk selects 15 completed reservations and clicks "Bulk Approve" instead of opening each one individually.*

### 20. Price Override with Required Reason

**Proposed:** Allow staff to override unit prices on POS and job order items, but require selecting a reason from a dropdown (e.g., damaged packaging, loyal customer discount, price match, manager approval). The original price, new price, reason, and staff member are logged to the audit trail.

*Why: Price adjustments happen in real shops, but without a required reason and audit log, it's impossible to tell whether a discount was legitimate or an error. The reason field creates accountability.*

---

## UI/UX -- Shop Floor

### 21. Photo Attachments on Job Orders

**Proposed:** Let mechanics and staff upload photos directly to a job order from a phone or tablet. Photos are stored alongside the job order and visible to both staff and the customer.

*Example: A mechanic takes a photo of a cracked brake rotor before replacing it. The customer sees the photo on their billing page and understands exactly why the replacement was needed -- reducing disputes and building trust.*

### 22. Calendar/Schedule View for Job Orders

**Proposed:** Add a day/week calendar view as an alternative to the job order list. The calendar shows booked time slots with customer name and service type, assigned bays (color-coded by availability), and mechanic assignments.

*Why: A list is good for searching and filtering, but a calendar is the natural way to answer "Do we have room for a walk-in at 2 PM?" Staff can drag an unscheduled job order into an open slot to book it.*




