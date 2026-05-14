# CS17/L: Deliverable 8 - Functional Test Cases

AlienCare: Auto Repair Management System (ARMS)

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Authentication & Authorization*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Register New Account | New user account created with email and password. | | | |
| Login with Valid Credentials | User authenticated and redirected to role-based dashboard. | | | |
| Login with Invalid Credentials | Error message displayed. User remains on login page. | | | |
| Forgot Password | Password reset link sent to registered email. | | | |
| Reset Password | Password updated successfully. User can login with new password. | | | |
| Logout | Session terminated. User redirected to login page. | | | |
| Role-Based Access: Admin | Admin can access admin dashboard, front desk accounts, and booking slots. | | | |
| Role-Based Access: Front Desk | Front Desk can access dashboard, job orders, POS, billing, inventory, customers, and reports. | | | |
| Role-Based Access: Customer | Customer can access customer portal, services, my services, shop, and billing. | | | |
| Unauthorized Route Access | Users redirected away from routes not matching their role. | | | |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Customer Information Management System*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Create Customer Account | A new customer account is registered with account status set to Pending. | | | |
| Customer Self-Registration | Public user registers via registration form. Account created with pending status. | | | |
| Complete Customer Onboarding | Customer completes profile with personal info and vehicle details. | | | |
| Approve Customer Account | Front Desk approves pending account. Status updated to Approved. | | | |
| Reject Customer Account | Front Desk rejects account with reason. Status updated to Rejected. | | | |
| Update Personal Information | Customer profile fields updated. Audit log entry created. | | | |
| Update Special Information | Preferred contact method and special notes updated. | | | |
| Add Customer Vehicle Information | Vehicle details added and linked to customer record. | | | |
| Update Vehicle Information | Vehicle details updated successfully. | | | |
| Deactivate Customer Account | Customer account deactivated. User cannot log in. | | | |
| Update Customer Tier Settings | Tier mode (Auto/Manual) and overrides configured. VIP and Fleet tiers assigned automatically. | | | |
| Create Walk-in Customer Record | Front Desk creates customer profile. Account auto-approved. | | | |
| View Job Order Transaction History | Customer's job order history displayed with status, date, and total cost. | | | |
| View POS Transaction History | Customer's POS transaction history displayed with items and totals. | | | |
| View Customer Billing Summary | Total outstanding balance and last payment information displayed. | | | |
| View Customer Audit Log | Changes to customer record displayed with action, old/new values, user, and timestamp. | | | |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Vehicle Management*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Add Vehicle to Customer | Vehicle record created with plate number, make, model, year, color, and VIN. | | | |
| Update Vehicle Details | Vehicle information updated successfully. | | | |
| Approve Vehicle | Pending vehicle approved. Status updated to Approved. | | | |
| Reject Vehicle | Pending vehicle rejected. Status updated to Rejected. | | | |
| Delete Vehicle | Vehicle record removed from customer profile. | | | |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Service Catalog Management*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| View Public Service Catalog | Active services displayed with name, price, duration, category, and rating. | | | |
| View Service Detail | Full service details including features, inclusions, and estimated duration. | | | |
| Create New Service | Service created with name, price, category, features, and active status. | | | |
| Update Service Details | Service information modified. Changes reflected in catalog. | | | |
| Deactivate Service | Service hidden from public catalog but retained for historical reference. | | | |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Job Order Management System*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Create Walk-in Job Order | New JO created with unique JO number (JO-YYYY-NNNN) and status set to Created. | | | |
| Create Online Booking Job Order | Customer booking creates JO with Online Booking source. | | | |
| Check Slot Availability | Available time slots displayed with capacity and current booking count. | | | |
| Add Service Item to Job Order | Service added as line item with quantity and price. Total auto-calculated. | | | |
| Add Parts Item to Job Order | Inventory part added as line item. Parts reservation auto-created. | | | |
| Update Job Order Item | Line item quantity or price modified. Total recalculated. | | | |
| Remove Job Order Item | Line item removed. Linked reservation cancelled if applicable. | | | |
| Submit Job Order for Approval | JO status transitions from Created to Pending Approval. | | | |
| Approve Job Order | JO status transitions from Pending Approval to Approved. | | | |
| Assign Mechanic and Bay | Mechanic and bay assigned. Mechanic set to Busy, bay set to Occupied. | | | |
| Mark Job Started | JO status transitions from Approved to In Progress. | | | |
| Complete Job Order | JO status transitions from In Progress to Completed. Mechanic and bay released. | | | |
| Settle and Close Job Order | JO status transitions from Completed to Settled. JO becomes read-only. | | | |
| Cancel Job Order | JO status transitions to Cancelled. All resources released. | | | |
| View Job Order List with Filters | JOs filtered by status, source, customer, mechanic, search term, and date range. | | | |
| View Job Order Detail | Full JO details displayed: customer, vehicle, service, mechanic, bay, items, costs. | | | |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Inventory Management System*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| View Inventory List | Inventory items displayed with SKU, name, stock, available stock, reorder level, and price. | | | |
| View Inventory Item Detail | Item details with linked reservations and stock transaction history. | | | |
| Add New Inventory Item | Item created with SKU, name, category, stock, reorder level, unit price, and supplier. | | | |
| Update Inventory Item | Item details modified. Stock not directly editable (use stock operations). | | | |
| Discontinue Inventory Item | Item status set to Discontinued. Hidden from active inventory. | | | |
| Check Stock Availability | Available stock displayed (stock minus pending reservations). | | | |
| Add Stock (Procurement) | Stock quantity increased. Procurement transaction logged. | | | |
| Deduct Stock (Sale) | Stock quantity decreased. Sale transaction logged. Low stock alert triggered if below reorder level. | | | |
| Log Damaged Parts | Damaged quantity deducted from stock. Damage transaction logged. | | | |
| Log Returned Parts | Returned quantity added to stock. Return transaction logged. | | | |
| Generate Low-Stock Alert | System scans inventory and creates alerts for items below reorder level. | | | |
| View Stock Transaction History | Transactions filtered by date range, type, and item. | | | |
| End-of-Day Reconciliation | Stock movements reconciled for the period. Opening, additions, deductions, and closing stock summarized. | | | |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Parts Reservation Management*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Reserve Parts for Job Order | Parts reserved with pending status. Stock not yet deducted. Expiry date set. | | | |
| Batch Reserve Multiple Parts | Multiple parts reserved in a single request. Partial success handled gracefully. | | | |
| Approve Parts Reservation | Reservation approved. Stock deducted from inventory. | | | |
| Complete Reservation | Reservation marked as completed. Parts considered consumed. | | | |
| Cancel Pending Reservation | Reservation cancelled. No stock impact (was not deducted). | | | |
| Cancel Approved Reservation | Reservation cancelled. Stock restored to inventory. | | | |
| Reject Reservation | Reservation rejected with reason. No stock impact. | | | |
| Pay Reservation Fee via Xendit | Reservation fee invoice generated via Xendit. Payment URL returned to customer. | | | |
| View Active Reservations Summary | Dashboard summary of pending, approved, and expiring reservations. | | | |
| Handle Expired Reservation | Reservations past expiry date flagged. Expired scope filters them. | | | |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Billing & Payment System*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| View Unified Billing Queue | Combined job order and POS billing items displayed with balance calculations. | | | |
| Generate Service Invoice | Invoice generated from completed JO with line items and total cost. | | | |
| Generate POS Invoice | Invoice generated from POS cart items after checkout. | | | |
| Create Xendit Payment Link (Single) | Xendit invoice created for a transaction. Payment URL generated for customer. | | | |
| Create Xendit Bulk Invoice | Single invoice covering all pending transactions. Combined payment URL generated. | | | |
| Front Desk Generate Payment Link | Front desk creates Xendit invoice on behalf of customer. Payment link shared. | | | |
| Xendit Webhook: Payment Success | Xendit callback updates transaction status to Paid. Paid timestamp recorded. | | | |
| Xendit Webhook: Payment Expired | Xendit callback updates transaction status to Expired. | | | |
| Sync Xendit Payment Status (Manual) | System fetches current status from Xendit API and updates local records. | | | |
| Cash Payment Processing | Cash payment recorded. Transaction marked as paid immediately. | | | |
| Card Payment Processing (In-Person) | Card payment recorded at front desk. Transaction marked as paid immediately. | | | |
| E-wallet Payment via Xendit | Customer pays through Xendit channels (GCash, bank transfer, retail). Status updated via webhook. | | | |
| Issue Official Receipt | Receipt generated with shop info, transaction details, line items, and payment method. | | | |
| Print Receipt | Receipt formatted for printing via browser or thermal printer. | | | |
| Audit Logging for Billing | All billing transactions logged in archives with old/new data and user info. | | | |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Point of Sale*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Search/Scan Item | POS retrieves item by name or SKU. Item details and available stock displayed. | | | |
| Add Item to Cart | Selected item added with quantity. Cart subtotal and running total updated. | | | |
| Add Multiple Items to Cart | Multiple items in cart. Each line independently editable. | | | |
| Update Cart Item Quantity | Cart recalculates subtotal and total on quantity change. | | | |
| Remove Item from Cart | Item removed. Cart total updated. | | | |
| Select Payment Method | Payment method selected: Cash, Card, or Online (Xendit). | | | |
| Process Cash Payment | Cash transaction recorded. Inventory deducted. Receipt generated. | | | |
| Process Card Payment | Card transaction recorded as paid. Inventory deducted. Receipt generated. | | | |
| Process Online Payment via Xendit | Xendit invoice created. Payment URL returned. Inventory deducted. Status pending webhook. | | | |
| Generate POS Receipt | Receipt generated after successful checkout with items, totals, and payment method. | | | |
| Update Inventory after POS Sale | Sold items deducted from stock. Stock transactions logged. | | | |
| View POS Transaction History | Past POS transactions displayed with items, totals, and payment method. | | | |
| Handle Failed Xendit Invoice Creation | Error displayed to cashier. Cart preserved. Retry or switch payment option available. | | | |
| Handle Insufficient Stock at Checkout | System detects stock shortage. Error displayed. Cart updated to reflect available quantity. | | | |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Reports & Analytics*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Generate Daily Usage Report | Daily report created with inventory usage breakdown for the selected date. | | | |
| Generate Monthly Procurement Report | Monthly report created with procurement totals and supplier breakdown. | | | |
| Generate Reconciliation Report | Stock reconciliation report showing opening, additions, deductions, and closing stock. | | | |
| View Report List | Reports displayed with type, date, and summary preview. Filterable by type and date range. | | | |
| View Report Detail | Full report with expanded data summary displayed. | | | |
| Export Report to CSV | Report data downloaded as CSV file. | | | |
| Export Report to PDF | Report data downloaded as PDF file. | | | |
| Dashboard KPI Summary | Dashboard displays: inventory value, low stock count, active jobs, today's revenue, monthly trends. | | | |
| View Usage Analytics | Usage trends and top consumed items displayed for selected date range. | | | |
| View Procurement Analytics | Procurement trends, top suppliers, and cost analysis displayed for selected date range. | | | |
| Archive Reports | Reports stored in database for audit. Queryable by date range. | | | |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Alerts & Notifications*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| View All Alerts | Alerts displayed with type, urgency, message, and acknowledgment status. | | | |
| View Alert Statistics | Alert counts by urgency, type, and acknowledgment status. | | | |
| Auto-Generate Low Stock Alert | Alert automatically created when stock drops below reorder level. Urgency based on severity. | | | |
| Manually Generate Low Stock Alerts | System scans all inventory and creates/updates alerts for items below reorder level. | | | |
| Acknowledge Single Alert | Alert marked as acknowledged with user and timestamp. | | | |
| Bulk Acknowledge Alerts | Multiple alerts acknowledged in one action. | | | |
| Cleanup Old Acknowledged Alerts | Acknowledged alerts older than 30 days deleted. | | | |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Customer Self-Service Portal*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Browse Available Services | Active services displayed with name, price, duration, rating, and recommended badges. | | | |
| Check Booking Slot Availability | Available time slots for selected date displayed with capacity info. | | | |
| Book Service (Pay at Shop) | Booking created. Reservation hold for 60 minutes. Customer pays at shop later. | | | |
| Book Service with Online Payment | Booking created with Xendit payment. Reservation hold for 24 hours. Customer redirected to payment page. | | | |
| View My Bookings / Job Orders | Customer's job orders displayed with status, service, date, and time. | | | |
| Reschedule a Booking | Arrival date and time updated for the selected booking. | | | |
| Cancel a Booking | Booking cancelled. Status set to Cancelled. | | | |
| Browse Shop Items | Available inventory items displayed with name, price, and stock. | | | |
| Shop Checkout via Xendit | Cart items purchased. Xendit invoice created with payment URL. | | | |
| Shop Checkout (Pay at Shop) | Order placed with pay-at-shop flag. Customer pays in person later. | | | |
| View My Billing Summary | Total outstanding balance and last payment displayed. | | | |
| View My Billing Receipts | Payment receipts displayed with transaction details, line items, and payment method. | | | |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron** |
| **Module Name:** | ***Admin Management*** |

|

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| View Front Desk Accounts | List of users with Front Desk role displayed. | | | |
| Create Front Desk Account | New user account created with Front Desk role. | | | |
| Delete Front Desk Account | Front Desk account removed from system. | | | |
| View Booking Slot Configuration | Current time slots with capacity and active status displayed. | | | |
| Update Booking Slots | Time slots added, modified, or deactivated. Capacity limits updated. | | | |
| Set Slot Capacity | Maximum concurrent bookings per time slot configured. | | | |

