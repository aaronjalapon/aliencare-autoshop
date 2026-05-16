# **CS17/L: Deliverable 8 \- Functional Test Cases**

AlienCare: Auto Repair Management System (ARMS)

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon Bongcac, John Benedict Jalapon, Aaron** |
| **Module Name:** | ***Job Order Management System*** |

\`

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Create Job Order | The system creates a new JO with a unique JO number. | JO generated successfully. | Passed |  |
| Approve Job Order | Front Desk approves job order. | JO status updated to Approved. | Passed |  |
| Assign Mechanic | Available mechanics are assigned to JO. | Mechanic assigned correctly. | Passed |  |
| Assign Bay/Lift | System assign available bay/lift. | Bay assigned successfully. | Passed |  |
| Mark Job Started | JO status changes to In Progress. | The job started successfully. | Passed |  |
| Prepare Invoice Draft | Invoice draft generated from services and parts. | Invoice created successfully. | Passed |  |
| Close Job Order | JO marked as Closed after payment. | Job order status set as Completed | Passed |  |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon Bongcac, John Benedict Jalapon, Aaron** |
| **Module Name:** | ***Customer Information Management System*** |

## 

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Create Customer Account | A new customer account is registered. | Customer account saved successfully. | Passed |  |
| Customer Email Verification | Email Verification is sent to Customer | Customer account verified Successfully | Fail |  |
| Update Personal Information | Customer profile updates successfully. | Updated customer data reflected. | Passed |  |
| Add Customer Vehicle Information | Vehicle information is added | Vehicle details added correctly | Passed |  |
| Update Vehicle Information | Vehicle information is updated. | Vehicle details updated correctly. | Passed |  |
| Deactivate Customer Account | The customer account is removed from the system. | Account deleted successfully. | Fail |  |
| Create Walk-in Customer Record | Front Desk creates customer profiles. | Walk-in customer record saved. | Passed |  |
| View Job Order Transaction History | The system displays Job Order transaction records. | Customer Job Order transaction history displayed. | Fail |  |
| View POS Transaction History | The system displays POS Transaction records. | Customer POS transaction history displayed. | Fail |  |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon Bongcac, John Benedict Jalapon, Aaron** |
| **Module Name:** | ***Billing & Payment System*** |

## 

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Generate Service Invoice | Invoice generated from completed JO. | Invoice displayed correctly. | Passed |  |
| Cash Payment Processing | Cash payment recorded successfully. | Payment saved in billing records. | Passed |  |
| GCash Payment Processing | GCash payment processed successfully. | Payment confirmed successfully. | Fail |  |
| Card Payment via Xendit | Xendit API processes card payment. | Payment approved and recorded. | Fail |  |
| Issue Official Receipt | Receipt generated after payment. | Receipt printed successfully. | Passed |  |
| Update Financial Records | Financial ledgers updated after payment. | Records updated successfully. | Passed |  |
| Audit Logging | System logs billing transactions. | Audit entries created successfully. | Passed |  |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon Bongcac, John Benedict Jalapon, Aaron** |
| **Module Name:** | ***Inventory Management System*** |

## 

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Check Stock Availability | The system displays the current stock quantity. | Stock displayed correctly. | Passed |  |
| Reserve Parts | Requested parts are reserved for JO. | Parts reserved successfully. | Fail |  |
| Deduct Stock after Sale | Inventory quantity decreases after sale. | Stock updated automatically. | Passed |  |
| Log Damaged Parts | Damaged parts reduce stock quantity. | Damaged parts recorded successfully. | Passed |  |
| Log Returned Parts | Returned parts increase inventory stock. | Returned items added successfully. | Passed |  |
| Add New Stock | Supplier delivery updates inventory. | Stock quantity increased. | Passed |  |
| Generate Low-Stock Alert | The system creates a low-stock notification. | Alert displayed successfully. | Passed |  |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon Bongcac, John Benedict Jalapon, Aaron** |
| **Module Name:** | ***Reports & Analytics*** |

## 

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Generate Daily Financial Report | The system generates daily reports. | Daily report displayed correctly. | Fail |  |
| Generate Weekly Productivity Report | The system summarizes weekly performance. | Weekly report generated successfully. | Passed |  |
| Generate Monthly Financial Report | Monthly revenue and expenses summarized. | Monthly report displayed correctly. | Passed |  |
| Forecast Revenue Trends | The system forecasts future revenue. | Forecast results generated. | Passed |  |
| Generate Daily Usage Report | The system generates a usage report. | Daily report created successfully. | Fail |  |
| Export Reports | Reports exported to PDF/ Excel. | Export completed successfully. | Passed |  |
| Archive Reports | Reports stored for auditing. | Archived reports saved successfully. | Passed |  |
| End-of-Day Reconciliation | The system reconciles stock movement. | Reconciliation completed successfully. | Passed |  |
| Dashboard Summary Display | Dashboard shows KPIs and analytics. | Dashboard data displayed correctly. | Passed |  |

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | **Aracena, Robert Jhon Bongcac, John Benedict Jalapon, Aaron** |
| **Module Name:** | ***Point of Sale*** |

## 

| Scenarios | Expected Result | Actual Result | Test Result | Action Taken |
| ----- | ----- | ----- | ----- | ----- |
| Search/Scan Item | POS retrieves item information. | Item details displayed correctly. | Passed |  |
| Add Item to Cart | Selected item added to transaction cart. | Cart updated successfully. | Passed |  |
| Select Payment Method | System records selected payment type. | Payment option selected successfully. | Passed |  |
| Process E-wallet/Card Payment | Payment gateway processes transactions. | Payment approved successfully. | Fail |  |
| Process Cash Payment | Cash transaction recorded. | Payment marked as paid. | Passed |  |
| Generate POS Receipt | Receipt generated after checkout. | Receipt issued successfully. | Passed |  |
| Update Inventory after POS Sale | Sold items deducted from stock. | Inventory updated successfully. | Passed |  |
| Handle Failed Transactions | The system notifies the cashier of a failed payment. | Retry/cancel option displayed. | Fail |  |

