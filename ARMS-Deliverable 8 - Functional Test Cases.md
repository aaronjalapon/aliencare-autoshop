# CS17/L: Deliverable 8 - Functional Test Cases

AlienCare: Auto Repair Management System (ARMS)

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Proponents:** | Aracena, Robert Jhon / Bongcac, John Benedict / Jalapon, Aaron |
| **System Name:** | AlienCare Auto Repair Management System (ARMS) |
| **Date:** | May 14, 2026 |
| **Version:** | 2.0 |

---

## Table of Contents
1. [Authentication & Authorization](#1-authentication--authorization)
2. [User Profile & Settings](#2-user-profile--settings)
3. [Customer Information Management](#3-customer-information-management)
4. [Vehicle Management](#4-vehicle-management)
5. [Service Catalog Management](#5-service-catalog-management)
6. [Job Order Management](#6-job-order-management)
7. [Inventory Management](#7-inventory-management)
8. [Parts Reservation Management](#8-parts-reservation-management)
9. [Billing & Payment System](#9-billing--payment-system)
10. [Point of Sale](#10-point-of-sale)
11. [Reports & Analytics](#11-reports--analytics)
12. [Alerts & Notifications](#12-alerts--notifications)
13. [Customer Self-Service Portal](#13-customer-self-service-portal)
14. [Admin Management](#14-admin-management)

---

## Legend

| Prefix | Meaning |
|--------|---------|
| **[P]** | Positive / Happy Path Test |
| **[N]** | Negative / Error Handling Test |
| **[E]** | Edge Case / Boundary Test |

---

## 1. Authentication & Authorization

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Authentication & Authorization*** |
| **Module Code:** | AUTH |

### 1.1 User Registration

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AUTH-001 | [P] | Register new account with valid data | User is on the registration page | 1. Navigate to /register 2. Enter valid name, email, password (min 8 chars), and confirm password 3. Click Register | Account created successfully. POST /auth/register returns 201. User redirected to login or email verification notice. | | |
| TC-AUTH-002 | [P] | Register with role selection | Registration form loaded | 1. Fill in registration form 2. Select role (Customer/FrontDesk) 3. Submit form | User record created with selected role (UserRole enum). Default role is 'customer'. | | |
| TC-AUTH-003 | [N] | Register with existing email | A user already exists with test@example.com | 1. Navigate to /register 2. Enter the existing email 3. Submit form | POST /auth/register returns 422. Error message: "The email has already been taken." Registration rejected. | | |
| TC-AUTH-004 | [N] | Register with invalid password format | Registration page open | 1. Enter valid name and email 2. Enter password "123" (too short) 3. Submit form | POST /auth/register returns 422. Error: password must be at least 8 characters. | | |
| TC-AUTH-005 | [N] | Register with mismatched password confirmation | Registration page open | 1. Fill all fields 2. Enter different values for password and confirm password 3. Submit form | POST /auth/register returns 422. Error: password confirmation does not match. | | |
| TC-AUTH-006 | [N] | Register with missing required fields | Registration page open | 1. Leave name field blank 2. Fill other fields 3. Submit form | POST /auth/register returns 422. Validation errors for required fields (name, email, password). | | |

### 1.2 User Login

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AUTH-007 | [P] | Login with valid credentials | User account exists (e.g., frontdesk@aliencare.test / AlienCare123!) | 1. Navigate to /login 2. Enter correct email and password 3. Click Login | POST /auth/login returns 200 with user data. Session/token created. User redirected to role-based home (/dashboard for frontdesk, /admin for admin, /customer for customer). | | |
| TC-AUTH-008 | [N] | Login with incorrect password | User account exists | 1. Enter correct email 2. Enter wrong password 3. Click Login | POST /auth/login returns 401 or 422. Error: "These credentials do not match our records." User remains on login page. | | |
| TC-AUTH-009 | [N] | Login with non-existent email | No account with test@unknown.com | 1. Enter non-existent email 2. Enter any password 3. Click Login | POST /auth/login returns 401 or 422. Error: credentials not found. | | |
| TC-AUTH-010 | [N] | Login with empty fields | Login page open | 1. Leave email and password blank 2. Click Login | POST /auth/login returns 422. Validation errors for required fields. | | |
| TC-AUTH-011 | [E] | Login with case-insensitive email | User registered as User@Example.com | 1. Enter "user@example.com" (lowercase) 2. Enter correct password 3. Click Login | Should authenticate successfully (email normalized to lowercase). | | |

### 1.3 Password Reset

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AUTH-012 | [P] | Request password reset link | User account exists with valid email | 1. Navigate to /forgot-password 2. Enter registered email 3. Click Send Reset Link | POST /auth/forgot-password returns 200. Password reset email sent (logged to mail log in dev). Success message displayed. | | |
| TC-AUTH-013 | [P] | Reset password with valid token | Valid reset token received | 1. Click reset link (or navigate to /reset-password/{token}) 2. Enter new password and confirmation 3. Submit | POST /auth/reset-password returns 200. Password updated. User can login with new password. | | |
| TC-AUTH-014 | [N] | Reset password with expired token | Reset token older than 60 minutes | 1. Use expired reset link 2. Enter new password 3. Submit | POST /auth/reset-password returns error. Token expired message. Password unchanged. | | |
| TC-AUTH-015 | [N] | Request reset for non-existent email | No account with given email | 1. Enter non-existent email 2. Click Send Reset Link | System should return success message (to prevent email enumeration) but no email is sent. | | |

### 1.4 Logout

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AUTH-016 | [P] | Logout authenticated user | User is logged in | 1. Click Sign Out / Logout button 2. Confirm if prompted | POST /auth/logout returns 200. Session terminated. User redirected to login page. Protected routes become inaccessible. | | |

### 1.5 Role-Based Access Control

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-AUTH-017 | [P] | Admin accesses admin routes | User logged in with admin role | 1. Navigate to /admin 2. Navigate to /admin/frontdesk-accounts 3. Navigate to /admin/booking-slots | All admin pages accessible. Admin sidebar renders. GET /api/v1/admin/* endpoints return 200. | | |
| TC-AUTH-018 | [P] | Front Desk accesses frontdesk routes | User logged in with frontdesk role | 1. Navigate to /dashboard 2. Navigate to /job-orders 3. Navigate to /pos | All frontdesk pages accessible. Frontdesk sidebar renders. | | |
| TC-AUTH-019 | [P] | Customer accesses customer routes | User logged in with customer role | 1. Navigate to /customer 2. Navigate to /customer/services 3. Navigate to /customer/my-services | All customer pages accessible. Customer sidebar renders. | | |
| TC-AUTH-020 | [N] | Customer attempts to access frontdesk routes | User logged in with customer role | 1. Directly navigate to /dashboard 2. Directly navigate to /job-orders | User redirected to /customer. Frontdesk pages not accessible. API calls return 403 Forbidden. | | |
| TC-AUTH-021 | [N] | Front Desk attempts to access admin routes | User logged in with frontdesk role | 1. Directly navigate to /admin 2. Directly navigate to /admin/frontdesk-accounts | User redirected to /dashboard. Admin pages not accessible. API calls return 403. | | |
| TC-AUTH-022 | [N] | Unauthenticated user accesses protected routes | No user logged in | 1. Directly navigate to /dashboard 2. Directly navigate to /admin 3. Directly navigate to /customer | User redirected to /login for all protected routes. | | |
| TC-AUTH-023 | [N] | Access API endpoints without auth token | No token/session | 1. Send GET request to /api/v1/job-orders 2. Send POST to /api/v1/inventory | All return 401 Unauthorized. Sanctum middleware blocks access. | | |

---

## 2. User Profile & Settings

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***User Profile & Settings*** |
| **Module Code:** | USR |

### 2.1 View & Update Profile

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-USR-001 | [P] | View own profile | User logged in | 1. Click profile icon/avatar 2. Select "Profile" | GET /api/settings/profile returns 200. Displays name, email, phone_number, address, role. | | |
| TC-USR-002 | [P] | Update profile information | User logged in, on profile page | 1. Modify name, phone_number, or address 2. Click Save | PATCH /api/settings/profile returns 200. Updated fields reflected. GET /api/user returns updated data. | | |
| TC-USR-003 | [N] | Update profile with invalid email format | On profile page | 1. Change email to "notanemail" 2. Click Save | PATCH /api/settings/profile returns 422. Error: email must be a valid email address. | | |
| TC-USR-004 | [N] | Update profile with duplicate email | Another user already uses target@test.com | 1. Change email to the duplicate 2. Click Save | PATCH /api/settings/profile returns 422. Error: email already taken. | | |

### 2.2 Change Password

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-USR-005 | [P] | Change password with correct current password | User logged in | 1. Navigate to Settings > Password 2. Enter current password 3. Enter new password and confirmation 4. Click Update | PUT /api/settings/password returns 200. Password updated. Old password no longer works for login. | | |
| TC-USR-006 | [N] | Change password with incorrect current password | User logged in | 1. Enter wrong current password 2. Enter new password 3. Submit | PUT /api/settings/password returns 422 or 400. Error: current password is incorrect. | | |
| TC-USR-007 | [N] | Change password with too-short new password | User logged in | 1. Enter correct current password 2. Enter "123" as new password 3. Submit | PUT /api/settings/password returns 422. Error: new password minimum 8 characters. | | |

### 2.3 Delete Account

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-USR-008 | [P] | Delete own account | User logged in, no active dependencies | 1. Navigate to Settings > Profile 2. Click Delete Account 3. Confirm deletion | DELETE /api/settings/profile returns 200. Account soft-deleted or removed. User logged out and redirected to login. | | |

---

## 3. Customer Information Management

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Customer Information Management System*** |
| **Module Code:** | CIM |

### 3.1 Customer Registration & Onboarding

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-CIM-001 | [P] | Public self-registration | On landing page | 1. Navigate to /register 2. Fill customer registration form (name, email, phone, address, license_number) 3. Submit | POST /api/v1/customers/register returns 201. Customer record created with account_status = 'pending'. CustomerAccountCreated event fired. | | |
| TC-CIM-002 | [P] | Complete customer onboarding | Customer logged in, not yet onboarded | 1. Navigate to /customer/onboarding 2. Fill profile details and at least 1 vehicle 3. Submit | POST /api/v1/customer/onboarding returns 200. onboarding_completed_at set. Customer redirected to /customer. | | |
| TC-CIM-003 | [P] | Check onboarding status | Customer logged in | 1. Application loads 2. CustomerOnboardingGate checks status | GET /api/v1/customer/onboarding-status returns { onboarded: true/false }. If false, redirected to /customer/onboarding. | | |
| TC-CIM-004 | [N] | Register with existing email | Email already in customers table | 1. Fill registration form with existing email 2. Submit | POST /api/v1/customers/register returns 422. Error: email already registered. | | |
| TC-CIM-005 | [N] | Register with missing required fields | Registration form open | 1. Leave first_name and email blank 2. Submit | POST /api/v1/customers/register returns 422. Validation errors for required fields. | | |
| TC-CIM-006 | [N] | Attempt onboarding when already completed | Customer already onboarded | 1. Try to access /customer/onboarding directly | Redirected to /customer. Onboarding page not accessible. | | |

### 3.2 Front Desk: Create & Manage Customers

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-CIM-007 | [P] | Create walk-in customer record | Front desk logged in, on Customers page | 1. Click "Add Customer" 2. Fill first_name, last_name, email, phone_number, address 3. Submit | POST /api/v1/customers returns 201. Customer created with account_status = 'approved' (staff-created). Customer appears in list. | | |
| TC-CIM-008 | [P] | View customer list with filters | Front desk logged in, customers exist | 1. Navigate to /customers 2. Apply filters: account_status, segment, tier, search 3. Paginate through results | GET /api/v1/customers returns 200 with paginated data. Filters applied correctly. CustomerResource includes code (CUS-XXXXXXXX), tier info, vehicle count, total_spent. | | |
| TC-CIM-009 | [P] | View customer detail with summary | Customer exists with transactions | 1. Click on a customer row 2. View detail panel | GET /api/v1/customers/{id} returns 200. Shows full profile, vehicle list, job order history, transaction summary, tier (auto/manual), total_spent. | | |
| TC-CIM-010 | [P] | Update customer information | Customer exists, front desk logged in | 1. Open customer detail 2. Edit fields (phone, address, etc.) 3. Save | PUT /api/v1/customers/{id} returns 200. CustomerAuditLog entry created with old_data and new_data diff. | | |
| TC-CIM-011 | [P] | Update customer personal info with audit | Customer exists | 1. Click "Edit Personal Info" 2. Modify first_name, last_name, email, phone, address, license_number 3. Save | PUT /api/v1/customers/{id}/personal-info returns 200. Audit log records the change with ip_address. | | |
| TC-CIM-012 | [P] | Update customer special info | Customer exists | 1. Click "Edit Special Info" 2. Set preferred_contact_method and special_notes 3. Save | PUT /api/v1/customers/{id}/special-info returns 200. Fields updated. | | |
| TC-CIM-013 | [N] | Update customer with invalid email | Customer detail open | 1. Change email to invalid format 2. Save | PUT /api/v1/customers/{id} returns 422. Validation error for email format. | | |

### 3.3 Customer Approval Workflow

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-CIM-014 | [P] | Approve pending customer account | Customer with account_status = 'pending' | 1. Navigate to pending customer 2. Click "Approve" 3. Confirm | PUT /api/v1/customers/{id}/approve returns 200. account_status = 'approved', approved_by set, approved_at set. CustomerAccountApproved event fired. Customer can now log in. | | |
| TC-CIM-015 | [P] | Reject pending customer account | Customer with account_status = 'pending' | 1. Navigate to pending customer 2. Click "Reject" 3. Enter rejection_reason 4. Confirm | PUT /api/v1/customers/{id}/reject returns 200. account_status = 'rejected', rejection_reason stored. CustomerAccountRejected event fired. | | |
| TC-CIM-016 | [N] | Approve already approved customer | Customer account_status = 'approved' | 1. Try to approve the customer again | System returns 422 or the approve action is not available. No duplicate approval. | | |
| TC-CIM-017 | [N] | Reject without providing reason | Customer with account_status = 'pending' | 1. Click "Reject" 2. Leave reason blank 3. Confirm | PUT /api/v1/customers/{id}/reject returns 422. rejection_reason is required. | | |

### 3.4 Customer Account Management

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-CIM-018 | [P] | Activate/Deactivate customer account | Customer exists | 1. Toggle is_active switch 2. Confirm | PATCH /api/v1/customers/{id}/activation returns 200. is_active toggled. Deactivated customers cannot log in. | | |
| TC-CIM-019 | [P] | Update customer tier settings | Customer exists | 1. Open tier settings 2. Set tier_mode to 'auto' or 'manual' 3. If manual, set tier_overrides 4. Save | PATCH /api/v1/customers/{id}/tiers returns 200. Auto-tier: VIP at >=PHP 50,000 spent, Fleet at >=2 vehicles. Manual: uses overrides. | | |
| TC-CIM-020 | [P] | Request customer data deletion | Customer exists, no active job orders | 1. Click "Request Delete" 2. Confirm | PUT /api/v1/customers/{id}/request-delete returns 200. Validates no active job orders exist. CustomerAccountDeleted event fired. | | |
| TC-CIM-021 | [N] | Request deletion for customer with active job orders | Customer has job orders in non-terminal status | 1. Click "Request Delete" | System returns error: cannot delete customer with active job orders. Deletion rejected. | | |
| TC-CIM-022 | [P] | Hard delete customer record | Admin authorized, customer exists | 1. Click "Delete Permanently" 2. Confirm | DELETE /api/v1/customers/{id} returns 200. Customer record removed (soft deleted via SoftDeletes). | | |

### 3.5 Customer Transactions & Billing History

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-CIM-023 | [P] | View customer transaction history | Customer exists with transactions | 1. Open customer detail 2. Click "Transactions" tab | GET /api/v1/customers/{id}/transactions returns 200. Paginated list with type (invoice/payment/refund/reservation_fee), amount, payment_method, paid_at, xendit_status. | | |
| TC-CIM-024 | [P] | View customer billing summary | Customer exists with billing records | 1. Open customer detail 2. Click "Billing" tab | GET /api/v1/customers/{id}/billing/summary equivalent returns billing summary with total outstanding, last payment info. | | |
| TC-CIM-025 | [P] | View customer billing receipts | Customer has payment receipts | 1. Click on a billing transaction 2. View receipt | Receipt shows transaction details: job_order_no, payment_method, amount_paid, line items (service_fee + parts), customer/vehicle info. | | |
| TC-CIM-026 | [P] | Link transaction to customer | Transaction exists, customer exists | 1. Click "Link Transaction" 2. Enter transaction details 3. Save | POST /api/v1/customers/{id}/transactions returns 200. Transaction linked to customer. | | |
| TC-CIM-027 | [P] | View customer audit log | Customer has audit history | 1. Open customer detail 2. Click "Audit Log" tab | GET /api/v1/customers/{id}/audit-log returns 200. Shows action, entity_type, old_data, new_data, user who made change, ip_address, timestamp. | | |
| TC-CIM-028 | [P] | View customer's vehicles | Customer has vehicles registered | 1. Open customer detail 2. Click "Vehicles" tab | GET /api/v1/customers/{id}/vehicles returns 200. Lists all vehicles with plate_number, make, model, year, approval_status. | | |
| TC-CIM-029 | [P] | View customer's job orders | Customer has job orders | 1. Open customer detail 2. Click "Job Orders" tab | GET /api/v1/customers/{id}/job-orders returns 200. Lists all job orders for this customer with status, date, total cost. | | |

---

## 4. Vehicle Management

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Vehicle Management*** |
| **Module Code:** | VEH |

### 4.1 Vehicle CRUD

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-VEH-001 | [P] | Add vehicle to customer | Customer exists, front desk logged in | 1. Open customer detail 2. Click "Add Vehicle" 3. Fill plate_number, make, model, year, color, vin 4. Submit | POST /api/v1/customers/{id}/vehicles returns 201. Vehicle created with approval_status = 'pending'. VehicleApprovalRequested event fired. | | |
| TC-VEH-002 | [P] | Register new vehicle (standalone) | Front desk logged in | 1. Navigate to vehicles 2. Click "Register Vehicle" 3. Fill all fields including customer_id 4. Submit | POST /api/v1/vehicles returns 201. Vehicle created and linked to customer. | | |
| TC-VEH-003 | [P] | Update vehicle information | Vehicle exists | 1. Select vehicle 2. Click Edit 3. Modify fields (make, model, color, etc.) 4. Save | PUT /api/v1/vehicles/{id} returns 200. Vehicle details updated. | | |
| TC-VEH-004 | [P] | View all vehicles with filters | Vehicles exist | 1. Navigate to vehicles list 2. Apply filters (customer, approval_status) | GET /api/v1/vehicles returns 200. Paginated list with plate_number, make, model, year, customer info. | | |
| TC-VEH-005 | [N] | Add vehicle with duplicate plate number | Another vehicle already has plate "ABC 1234" | 1. Fill vehicle form 2. Enter duplicate plate 3. Submit | POST /api/v1/vehicles returns 422. Error: plate_number already exists. | | |
| TC-VEH-006 | [N] | Add vehicle with missing required fields | Vehicle form open | 1. Leave plate_number and make blank 2. Submit form | POST /api/v1/vehicles returns 422. Validation errors for required fields (plate_number, make, model). | | |
| TC-VEH-007 | [N] | Add vehicle with invalid year value | Vehicle form open | 1. Enter year "abcd" (non-numeric) 2. Submit | POST /api/v1/vehicles returns 422. Error: year must be an integer. | | |

### 4.2 Vehicle Approval Workflow

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-VEH-008 | [P] | Approve pending vehicle | Vehicle with approval_status = 'pending' | 1. Select pending vehicle 2. Click "Approve" 3. Confirm | PUT /api/v1/vehicles/{id}/approve returns 200. approval_status = 'approved', approved_by set, approved_at timestamped. | | |
| TC-VEH-009 | [P] | Reject pending vehicle | Vehicle with approval_status = 'pending' | 1. Select pending vehicle 2. Click "Reject" 3. Confirm | Vehicle approval_status set to 'rejected'. VehicleApprovalRequested handler logs the rejection. | | |
| TC-VEH-010 | [P] | Delete vehicle record | Vehicle exists, no active job orders | 1. Select vehicle 2. Click "Delete" 3. Confirm | DELETE /api/v1/vehicles/{id} returns 200. Vehicle removed from customer's vehicle list. | | |

---

## 5. Service Catalog Management

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Service Catalog Management*** |
| **Module Code:** | SVC |

### 5.1 Public Service Listing

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-SVC-001 | [P] | View public service catalog | No auth required | 1. Navigate to /customer/services 2. Browse service list | GET /api/v1/services returns 200. Lists active services with name, description, price_label, price_fixed, duration, category, features, includes, rating, recommended flag. | | |
| TC-SVC-002 | [P] | View service detail | Service exists | 1. Click on a service card 2. View detail | GET /api/v1/services/{id} returns 200. Full service details displayed with features list, includes list, rating, estimated duration. | | |
| TC-SVC-003 | [E] | View empty service catalog | No active services exist | 1. Navigate to services page | Empty state displayed with appropriate message. No errors. | | |

### 5.2 Admin: Manage Services

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-SVC-004 | [P] | View all services (including inactive) | Front desk logged in | 1. Navigate to service management 2. View full list | GET /api/v1/services/manage returns 200. Includes both active and inactive services. | | |
| TC-SVC-005 | [P] | Create new service | Front desk logged in | 1. Click "Add Service" 2. Fill name, description, price_label, price_fixed, duration, category, features, includes 3. Submit | POST /api/v1/services returns 201. Service created with is_active = true. Appears in public catalog. | | |
| TC-SVC-006 | [P] | Update service details | Service exists | 1. Select service 2. Click Edit 3. Modify fields (price, duration, features) 4. Save | PUT /api/v1/services/{id} returns 200. Service updated. Changes reflected in both manage view and public catalog. | | |
| TC-SVC-007 | [P] | Deactivate (soft delete) service | Service is active | 1. Select service 2. Click "Deactivate" or Delete 3. Confirm | DELETE /api/v1/services/{id} returns 200. is_active set to false. Service hidden from public catalog but retained in database (still referenced by existing job orders). | | |
| TC-SVC-008 | [N] | Create service with duplicate name | Service "Change Oil" already exists | 1. Try to create another "Change Oil" service 2. Submit | POST /api/v1/services returns 422. Error: service name must be unique (if enforced). | | |
| TC-SVC-009 | [N] | Create service with negative price | Service form open | 1. Enter price_fixed = -100 2. Submit | POST /api/v1/services returns 422. Error: price must be non-negative. | | |
| TC-SVC-010 | [N] | Create service with missing required fields | Service form open | 1. Leave name and category blank 2. Submit | POST /api/v1/services returns 422. Validation errors for required fields. | | |

---

## 6. Job Order Management

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Job Order Management System*** |
| **Module Code:** | JOM |

### 6.1 Create Job Order

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-JOM-001 | [P] | Create walk-in job order | Customer and vehicle exist, front desk logged in | 1. Navigate to /job-orders 2. Click "New Job Order" or open WalkInModal 3. Select customer, vehicle, service 4. Set arrival_date and arrival_time 5. Submit | POST /api/v1/job-orders returns 201. JO created with source = 'walk_in', status = 'created'. JO number auto-generated (JO-YYYY-NNNN). Auto-approved if slot has capacity. | | |
| TC-JOM-002 | [P] | Create job order with service items | JO exists in modifiable state | 1. Open JO detail 2. Click "Add Item" 3. Select service type item 4. Set quantity and price 5. Save | POST /api/v1/job-orders/{id}/items returns 201. JobOrderItem created with item_type = 'service'. Total price = quantity × unit_price (auto-calculated). | | |
| TC-JOM-003 | [P] | Create job order with parts items | JO exists, inventory item exists | 1. Open JO detail 2. Click "Add Item" 3. Select part type item from inventory 4. Set quantity 5. Save | POST /api/v1/job-orders/{id}/items returns 201. JobOrderItem created with item_type = 'part'. Auto-creates a Reservation for the inventory item. | | |
| TC-JOM-004 | [E] | JO number format verification | New JO created | 1. Create new JO in year 2026 2. Inspect the generated JO number | JO number follows format "JO-2026-XXXX" where XXXX is a zero-padded sequential number (e.g., JO-2026-0001). | | |
| TC-JOM-005 | [N] | Create job order without selecting customer | WalkInModal open | 1. Leave customer field empty 2. Fill other required fields 3. Submit | POST /api/v1/job-orders returns 422. Error: customer_id is required. | | |
| TC-JOM-006 | [N] | Create job order without selecting service | WalkInModal open | 1. Fill customer and vehicle 2. Leave service blank 3. Submit | POST /api/v1/job-orders returns 422. Error: service_id is required. | | |
| TC-JOM-007 | [N] | Create job order with past arrival date | WalkInModal open | 1. Set arrival_date to yesterday 2. Submit | POST /api/v1/job-orders returns 422. Error: arrival_date must be today or in the future. | | |

### 6.2 View & Filter Job Orders

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-JOM-008 | [P] | View all job orders with filtering | Multiple JOs with different statuses | 1. Navigate to /job-orders 2. Filter by status (Created, Pending, Approved, etc.) 3. Filter by source (Walk-in, Online Booking) 4. Filter by customer, mechanic 5. Search by JO number or customer name 6. Filter by date range | GET /api/v1/job-orders returns 200. Paginated results matching filters. JobOrderResource includes jo_number, status with label/color, total_cost, balance, arrival info, nested relations. | | |
| TC-JOM-009 | [P] | View active queue (today's jobs) | JOs exist for today | 1. Navigate to Job Orders 2. View Active/Queue tab | Jobs filtered to current date. Jobs with absolute schedule times displayed. Jobs without schedule or with relative dates filtered out (hasSchedule filter applied). | | |
| TC-JOM-010 | [P] | View job order detail | JO exists | 1. Click on a JO row 2. View JobOrderDetail panel | GET /api/v1/job-orders/{id} returns 200. Shows full JO: customer, vehicle, service, mechanic, bay, items list with costs, reservations, status history, total_cost, balance, paid_amount. | | |
| TC-JOM-011 | [P] | View slot availability for a date | Booking slots configured | 1. Open new JO form 2. Select a date 3. Check available time slots | GET /api/v1/job-orders/slot-availability?date=YYYY-MM-DD returns 200. Lists time slots with capacity and current booking count. | | |

### 6.3 Job Order Lifecycle (State Machine)

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-JOM-012 | [P] | Submit JO for approval | JO with status = 'created' | 1. Open JO detail 2. Click "Submit for Approval" | PUT /api/v1/job-orders/{id}/submit returns 200. Status transitions: created → pending_approval. JobOrderStatusChanged event fired. Previous status recorded. | | |
| TC-JOM-013 | [P] | Approve job order | JO with status = 'pending_approval' | 1. Navigate to ApprovalQueue 2. Select JO 3. Click "Approve" | PUT /api/v1/job-orders/{id}/approve returns 200. Status: pending_approval → approved. approved_by and approved_at set. JO now eligible for starting. | | |
| TC-JOM-014 | [P] | Start job order with mechanic and bay | JO with status = 'approved', mechanic and bay available | 1. Open JO 2. Click "Start Service" 3. Select available mechanic (with time-conflict check) 4. Select available bay 5. Confirm | PUT /api/v1/job-orders/{id}/start returns 200. Status: approved → in_progress. Mechanic availability_status set to 'busy'. Bay status set to 'occupied'. StartServiceModal validates resources are available for the time slot. | | |
| TC-JOM-015 | [P] | Complete job order | JO with status = 'in_progress' | 1. Open JO 2. Click "Complete" 3. Confirm | PUT /api/v1/job-orders/{id}/complete returns 200. Status: in_progress → completed. Mechanic released (availability_status = 'available'). Bay released (status = 'available'). Linked reservations completed. | | |
| TC-JOM-016 | [P] | Settle and close job order | JO with status = 'completed', payment settled | 1. Open JO 2. Click "Settle" 3. Confirm settlement | PUT /api/v1/job-orders/{id}/settle returns 200. Status: completed → settled (terminal). settled_flag = true. Cannot be modified further. | | |
| TC-JOM-017 | [P] | Cancel job order (from Created) | JO with status = 'created' | 1. Open JO 2. Click "Cancel" 3. Provide reason 4. Confirm | DELETE /api/v1/job-orders/{id}/cancel returns 200. Status: created → cancelled (terminal). Resources not allocated yet, so nothing to release. Linked reservations cancelled. | | |
| TC-JOM-018 | [P] | Cancel job order (from In Progress) | JO with status = 'in_progress', mechanic and bay assigned | 1. Open JO 2. Click "Cancel" 3. Provide reason 4. Confirm | DELETE /api/v1/job-orders/{id}/cancel returns 200. Status: in_progress → cancelled. Mechanic released. Bay released. Linked reservations cancelled. | | |
| TC-JOM-019 | [N] | Attempt invalid status transition | JO with status = 'settled' (terminal) | 1. Try to cancel or modify a settled JO | PUT/DELETE returns 422 or 400. Error: cannot transition from 'settled'. JobOrderStatus.canTransitionTo() returns false. | | |
| TC-JOM-020 | [N] | Attempt to start unapproved JO | JO with status = 'created' or 'pending_approval' | 1. Try to start the JO | PUT /api/v1/job-orders/{id}/start returns 422. Error: JO must be in 'approved' status to start. Invalid state transition. | | |
| TC-JOM-021 | [N] | Attempt to complete unstarted JO | JO with status = 'approved' | 1. Try to complete the JO | PUT /api/v1/job-orders/{id}/complete returns 422. Error: cannot transition from 'approved' to 'completed'. Must be 'in_progress'. | | |
| TC-JOM-022 | [N] | Attempt to modify terminal JO items | JO with status = 'settled' or 'cancelled' | 1. Try to add/update/remove items | POST/PUT/DELETE on items returns 422. JobOrderStatus.canBeModified() returns false for terminal states. | | |

### 6.4 Mechanic & Bay Assignment

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-JOM-023 | [P] | View mechanics with availability check | Mechanics exist, scheduling context provided | 1. Open StartServiceModal with arrival_date and arrival_time 2. View mechanic list | GET /api/v1/mechanics?arrival_date=YYYY-MM-DD&arrival_time=HH:MM returns 200. Mechanics with has_time_conflict = false shown as available. Mechanics with has_time_conflict = true shown as conflicted. Busy mechanics without time conflict shown as available (per-slot logic). On-leave mechanics filtered separately. | | |
| TC-JOM-024 | [P] | View bays with availability check | Bays exist, scheduling context provided | 1. Open StartServiceModal 2. View bay list | GET /api/v1/bays?arrival_date=YYYY-MM-DD&arrival_time=HH:MM returns 200. Available bays shown. Occupied bays for the time slot shown as unavailable. Bays in maintenance excluded. | | |
| TC-JOM-025 | [E] | Mechanic availability without scheduling context | No arrival_date/arrival_time provided | 1. View mechanics list without time params | has_time_conflict is undefined/omitted. Mechanics with availability_status = 'busy' excluded from available list. Fallback to legacy behavior (global busy flag). | | |
| TC-JOM-026 | [N] | Assign mechanic already booked for time slot | Mechanic assigned to 10-11 AM slot | 1. Try to assign same mechanic to another 10-11 AM job | System shows mechanic as "Conflicting schedule at this time". Mechanic cannot be selected. | | |
| TC-JOM-027 | [N] | Assign bay already occupied for time slot | Bay occupied for 10-11 AM | 1. Try to assign same bay to another 10-11 AM job | Bay shown as unavailable. Selection blocked. | | |
| TC-JOM-028 | [E] | Assign on-leave mechanic | Mechanic with availability_status = 'on_leave' | 1. Try to assign on-leave mechanic | Mechanic excluded from available list entirely. Shown with reduced opacity (30%) in UI. Cannot be selected. | | |

### 6.5 Job Order Items Management

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-JOM-029 | [P] | Update job order item | JO in modifiable state, item exists | 1. Open JO detail 2. Click edit on an item 3. Modify quantity or unit_price 4. Save | PUT /api/v1/job-orders/{id}/items/{itemId} returns 200. Item updated. total_price recalculated (quantity × unit_price). | | |
| TC-JOM-030 | [P] | Remove job order item | JO in modifiable state, item exists | 1. Open JO detail 2. Click delete on an item 3. Confirm | DELETE /api/v1/job-orders/{id}/items/{itemId} returns 200. Item removed. If item was a part, linked reservation cancelled. | | |
| TC-JOM-031 | [E] | JO total cost calculation | JO has multiple items (service + parts) | 1. View JO detail 2. Check total_cost | total_cost = sum of all item (quantity × unit_price) + service_fee. calculateTotalCost() returns correct sum. | | |

### 6.6 Update Job Order

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-JOM-032 | [P] | Update job order details | JO in modifiable state | 1. Open JO 2. Edit arrival_date, arrival_time, notes, service_id 3. Save | PUT /api/v1/job-orders/{id} returns 200. Fields updated. | | |
| TC-JOM-033 | [N] | Update job order in terminal state | JO with status = 'settled' | 1. Try to edit JO details | PUT /api/v1/job-orders/{id} returns 422. JobOrderStatus.canBeModified() returns false. | | |

---

## 7. Inventory Management

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Inventory Management System*** |
| **Module Code:** | INV |

### 7.1 Inventory Item CRUD

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-INV-001 | [P] | View inventory list with filters | Inventory items exist | 1. Navigate to /inventory 2. Filter by category, low_stock flag, search by name/SKU 3. Paginate | GET /api/v1/inventory returns 200. InventoryResource includes item_id, sku, item_name, stock, available_stock (stock minus pending reservations), reorder_level, unit_price, is_low_stock, total_value, category. | | |
| TC-INV-002 | [P] | View inventory item detail | Item exists | 1. Click on an inventory item 2. View detail panel | GET /api/v1/inventory/{item_id} returns 200. Shows item details, linked reservations, stock transactions history. | | |
| TC-INV-003 | [P] | Add new inventory item | Front desk logged in | 1. Click "Add Item" 2. Fill item_name, sku, category, stock, reorder_level, unit_price, supplier, location 3. Submit | POST /api/v1/inventory returns 201. Item created with status = 'active'. Optional initial stock creates procurement stock transaction. | | |
| TC-INV-004 | [P] | Update inventory item | Item exists | 1. Select item 2. Click Edit 3. Modify fields (unit_price, reorder_level, supplier, etc.) 4. Save | PUT /api/v1/inventory/{item_id} returns 200. Item updated. Note: stock is NOT directly editable through update — use add-stock/deduct-stock endpoints. | | |
| TC-INV-005 | [P] | Discontinue inventory item | Item exists, no pending reservations | 1. Select item 2. Click "Delete" or "Discontinue" 3. Confirm | DELETE /api/v1/inventory/{item_id} returns 200. Item status set to 'discontinued' (soft delete). Item hidden from active inventory but retained in history. | | |
| TC-INV-006 | [N] | Add item with duplicate SKU | Item with SKU "BRK-001" already exists | 1. Create new item 2. Enter same SKU 3. Submit | POST /api/v1/inventory returns 422. Error: SKU must be unique. | | |
| TC-INV-007 | [N] | Add item with negative stock | Inventory form open | 1. Enter stock = -5 2. Submit | POST /api/v1/inventory returns 422. Error: stock must be non-negative. | | |
| TC-INV-008 | [N] | Add item with missing name | Inventory form open | 1. Leave item_name blank 2. Submit | POST /api/v1/inventory returns 422. Error: item_name is required. | | |

### 7.2 Stock Operations

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-INV-009 | [P] | Check stock availability for quantity | Item with stock = 10, pending reservations = 3 | 1. Check stock status with requested_quantity = 5 | GET /api/v1/inventory/{itemId}/stock-status?requested_quantity=5 returns 200. available_stock = 7 (10 - 3). is_available = true since 7 >= 5. Stock status object returned. | | |
| TC-INV-010 | [P] | Add stock (procurement) | Item exists | 1. Click "Add Stock" 2. Enter quantity, reference_number, notes 3. Submit | POST /api/v1/inventory/add-stock returns 200. Stock increased. StockTransaction created (type: procurement). Audit archive entry created. | | |
| TC-INV-011 | [P] | Deduct stock (sale) | Item with stock >= quantity | 1. Click "Deduct Stock" 2. Enter quantity, reference_number 3. Submit | POST /api/v1/inventory/deduct-stock returns 200. Stock decreased. StockTransaction created (type: sale). LowStockAlert event fired if stock drops below reorder_level. | | |
| TC-INV-012 | [N] | Deduct stock beyond available quantity | Item with stock = 5, pending = 2 (available = 3) | 1. Click "Deduct Stock" 2. Enter quantity = 10 3. Submit | POST /api/v1/inventory/deduct-stock returns 422. Error: insufficient stock. Only 3 available. | | |
| TC-INV-013 | [N] | Deduct stock with zero quantity | Item exists | 1. Click "Deduct Stock" 2. Enter quantity = 0 3. Submit | POST /api/v1/inventory/deduct-stock returns 422. Error: quantity must be greater than zero. | | |

### 7.3 Return & Damage Logging

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-INV-014 | [P] | Log returned parts | Item exists | 1. Click "Log Return" 2. Enter quantity, reference_number, notes 3. Submit | POST /api/v1/inventory/log-return-damage (transaction_type = 'return') returns 200. Stock increased. StockTransaction created. Archive entry created. | | |
| TC-INV-015 | [P] | Log damaged parts | Item with stock >= quantity | 1. Click "Log Damage" 2. Enter quantity, reference_number, notes 3. Submit | POST /api/v1/inventory/log-return-damage (transaction_type = 'damage') returns 200. Stock decreased. StockTransaction created. LowStockAlert fired if applicable. | | |
| TC-INV-016 | [N] | Log damage exceeding available stock | Item with available stock = 2 | 1. Log damage quantity = 5 2. Submit | POST /api/v1/inventory/log-return-damage returns 422. Error: insufficient stock to log damage. | | |

### 7.4 Stock Transaction History

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-INV-017 | [P] | View stock transaction history | Stock transactions exist | 1. Navigate to inventory transactions 2. Filter by date range, transaction_type, item | GET /api/v1/transactions returns 200. Paginated StockTransactionResource with type, quantity, previous_stock, new_stock, impact (positive/negative), reference_number. | | |
| TC-INV-018 | [P] | View single stock transaction | Transaction exists | 1. Click on a transaction row | GET /api/v1/transactions/{id} returns 200. Full transaction details with inventory item info. | | |
| TC-INV-019 | [E] | Filter transactions by all types | Transactions of all types exist | 1. Filter by procurement, sale, reservation, return, damage, adjustment_in, adjustment_out | Each filter returns only matching transactions. All 7 transaction types are filterable. | | |

### 7.5 Inventory Dashboard & Analytics

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-INV-020 | [P] | View inventory dashboard summary | Inventory data exists | 1. Navigate to Inventory dashboard | Dashboard displays: total_items, total_inventory_value, low_stock_count, out_of_stock_count, category_breakdown, top_value_items. Data from getInventorySummary(). | | |
| TC-INV-021 | [P] | View low stock items | Items below reorder_level exist | 1. Filter inventory by "Low Stock" flag | Items with stock <= reorder_level displayed. is_low_stock = true. Stock status indicator shown. | | |
| TC-INV-022 | [P] | Generate low stock alerts | Low stock items exist | 1. Click "Generate Low Stock Alerts" | GET /api/v1/inventory/alerts/low-stock returns 200. AlertService scans all items. Creates/updates Alert records for items below reorder_level. Returns list of generated alerts. | | |
| TC-INV-023 | [E] | Forecast demand for item | Item has sales history (90 days) | 1. View item detail 2. Check forecast section | forecastDemand() uses simple moving average on 90-day history. Returns projected demand for forecast period (30 days default). | | |
| TC-INV-024 | [P] | View reconciliation report | Stock movements exist | 1. Generate reconciliation report for date range | POST /api/v1/reports/reconciliation returns 200. Report with data_summary reconciling all stock movements (in/out/net). | | |
| TC-INV-025 | [E] | Concurrent stock deduction (distributed lock) | Two users attempt to deduct same item simultaneously | 1. User A deducts 5 units 2. User B deducts 5 units 3. Only 8 units available total | One operation succeeds, the other fails with "insufficient stock". Distributed lock (10s timeout) prevents race conditions. Pessimistic locking used (findByIdWithLock). | | |

---

## 8. Parts Reservation Management

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Parts Reservation Management*** |
| **Module Code:** | RES |

### 8.1 Reserve Parts

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-RES-001 | [P] | Reserve parts for job order | Inventory item exists with sufficient stock, JO exists | 1. Open JO or reservation panel 2. Select inventory item 3. Enter quantity and priority_level 4. Set is_urgent if needed 5. Submit | POST /api/v1/reservations/reserve returns 201. Reservation created with status = 'pending'. Does NOT deduct stock. Reservation linked to job_order_number. expires_at set (default 7 days). | | |
| TC-RES-002 | [P] | Batch reserve multiple parts | Multiple items exist | 1. Select multiple items 2. Set quantity for each 3. Submit all at once | POST /api/v1/reservations/reserve-multiple returns 200 (or 207 for partial success). Each valid item creates a Reservation. Partial success handled gracefully. | | |
| TC-RES-003 | [P] | Reserve parts with urgency flag | Item exists | 1. Create reservation 2. Set is_urgent = true 3. Set high priority_level | Reservation created with is_urgent = true and elevated priority_level. Urgent reservations highlighted in UI. | | |
| TC-RES-004 | [N] | Reserve more than available stock | Item with stock = 10, pending reservations = 6 (available = 4) | 1. Try to reserve quantity = 8 | POST /api/v1/reservations/reserve returns 422. Error: requested quantity (8) exceeds available stock (4). | | |
| TC-RES-005 | [N] | Reserve with zero quantity | Reservation form open | 1. Enter quantity = 0 2. Submit | POST /api/v1/reservations/reserve returns 422. Error: quantity must be greater than zero. | | |

### 8.2 Reservation Lifecycle

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-RES-006 | [P] | Approve reservation | Reservation with status = 'pending' | 1. Select reservation 2. Click "Approve" 3. Confirm | PUT /api/v1/reservations/{id}/approve returns 200. Status: pending → approved. Stock deducted. approved_by and approved_date set. ReservationUpdated event fired. | | |
| TC-RES-007 | [P] | Complete reservation | Reservation with status = 'approved' | 1. Select reservation 2. Click "Complete" 3. Confirm | PUT /api/v1/reservations/{id}/complete returns 200. Status: approved → completed. Parts considered consumed. | | |
| TC-RES-008 | [P] | Cancel reservation (pending, no stock impact) | Reservation with status = 'pending' | 1. Select reservation 2. Click "Cancel" 3. Provide reason 4. Confirm | PUT /api/v1/reservations/{id}/cancel returns 200. Status: pending → cancelled. No stock restored (wasn't deducted). | | |
| TC-RES-009 | [P] | Cancel reservation (approved, stock restored) | Reservation with status = 'approved', stock was deducted | 1. Select reservation 2. Click "Cancel" 3. Provide reason 4. Confirm | PUT /api/v1/reservations/{id}/cancel returns 200. Status: approved → cancelled. Stock restored (increased by reserved quantity). StockTransaction created (return). | | |
| TC-RES-010 | [P] | Reject reservation | Reservation with status = 'pending' | 1. Select reservation 2. Click "Reject" 3. Provide reason 4. Confirm | PUT /api/v1/reservations/{id}/reject returns 200. Status: pending → rejected. No stock impact. Rejection reason stored. | | |
| TC-RES-011 | [E] | Auto-expired reservation | Reservation past expires_at | 1. Wait for reservation to pass expiry 2. Check reservation status | Reservation.isExpired() returns true. System should handle expired reservations (scope: expired). | | |

### 8.3 Reservation Views & Summary

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-RES-012 | [P] | View all reservations with filters | Reservations exist | 1. Navigate to reservations 2. Filter by status, job_order, item, mine flag | GET /api/v1/reservations returns 200. Paginated with nested inventory and job order info. | | |
| TC-RES-013 | [P] | View single reservation detail | Reservation exists | 1. Click on a reservation | GET /api/v1/reservations/{id} returns 200. Shows reservation details, fee_payment_status, fee_payment_url (if fee paid), is_expired, total_value. | | |
| TC-RES-014 | [P] | View active reservations summary | Active reservations exist | 1. Navigate to dashboard 2. View reservation summary widget | GET /api/v1/reservations/summary returns 200. Summary counts by status, pending approvals, expiring soon. | | |

### 8.4 Reservation Fee Payment

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-RES-015 | [P] | Pay reservation fee via Xendit | Reservation exists, customer exists | 1. Select reservation 2. Click "Pay Fee" 3. System creates Xendit invoice | POST /api/v1/reservations/{id}/pay-fee returns 200. reservation_fee calculated (20% of total or PHP 200 minimum). CustomerTransaction created (type = reservation_fee). Xendit invoice generated. payment_url returned. | | |

---

## 9. Billing & Payment System

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Billing & Payment System*** |
| **Module Code:** | BIL |

### 9.1 Billing Queue

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-BIL-001 | [P] | View unified billing queue | Job orders and POS transactions exist | 1. Navigate to /billing 2. View billing queue | GET /api/v1/billing/queue returns 200. Unified queue combining JO and POS items. BillingQueueItemResource includes: entity_type, source, kind, customer info, subtotal, paid_total, balance, status, due_at. Filterable by source, status, search. | | |
| TC-BIL-002 | [P] | Filter billing queue by source | Mixed queue items exist | 1. Filter by source: job_order 2. Filter by source: pos 3. Filter by status: pending, paid, overdue | Each filter returns matching items. Balance calculated correctly (subtotal - paid_total). | | |
| TC-BIL-003 | [P] | Search billing queue | Queue has items from various customers | 1. Search by customer name 2. Search by invoice number | Matching items returned. Non-matching items excluded. | | |

### 9.2 Invoice Generation

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-BIL-004 | [P] | Generate service invoice from completed JO | JO with status = 'completed', items exist | 1. Open JO detail 2. View invoice | Invoice auto-generated from JO items (service_fee + parts). Total calculated. CustomerTransaction created (type = invoice). Invoice displays line items with descriptions, quantities, unit prices. | | |
| TC-BIL-005 | [P] | Generate POS invoice | POS checkout completed | 1. Complete POS sale 2. View generated invoice | Invoice created from POS cart items. CustomerTransaction (type = invoice) or direct payment recorded. | | |

### 9.3 Xendit Payment Processing

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-BIL-006 | [P] | Create Xendit invoice for single transaction | Customer has pending transaction | 1. Open billing 2. Select transaction 3. Click "Generate Payment Link" | POST /api/v1/payments/{transactionId}/invoice returns 200. XenditService.createInvoice() called. Xendit invoice ID, payment_url, and external_id stored on CustomerTransaction. | | |
| TC-BIL-007 | [P] | Create bulk invoice for all pending transactions | Customer has multiple pending transactions | 1. Click "Pay All" 2. System creates single bulk invoice | POST /api/v1/payments/pay-all returns 200. XenditService.createBulkInvoice() with batch_external_id. Single payment_url covering all pending amounts. All transactions linked via batch_external_id. | | |
| TC-BIL-008 | [P] | Front desk creates payment link for customer | Front desk logged in, transaction exists | 1. Open billing 2. Select transaction 3. Click "Generate Invoice" in PaymentSidePanel | POST /api/v1/payments/frontdesk/invoice returns 200. Payment link generated. payment_url displayed for sharing with customer. | | |
| TC-BIL-009 | [P] | Xendit webhook: payment success | Invoice created, customer paid via Xendit | 1. Xendit sends webhook with status = 'PAID' 2. System processes callback | POST /api/v1/payments/webhook returns 200. X-CALLBACK-TOKEN header validated. xendit_status updated to 'PAID'. paid_at set. Payment transaction recorded (type = payment). | | |
| TC-BIL-010 | [P] | Xendit webhook: payment expired | Invoice created, customer didn't pay | 1. Xendit sends webhook with status = 'EXPIRED' | xendit_status updated to 'EXPIRED'. Transaction remains unpaid. | | |
| TC-BIL-011 | [P] | Xendit webhook: batch callback | Bulk invoice paid | 1. Xendit sends batch callback 2. System processes all transactions in batch | All transactions with matching batch_external_id updated. Each gets paid_at and xendit_status = 'PAID'. | | |
| TC-BIL-012 | [P] | Sync Xendit payment status (manual) | Transaction has xendit_invoice_id | 1. Click "Sync Status" button 2. System queries Xendit API | POST /api/v1/payments/sync (or frontdesk/sync) returns 200. XenditService.getInvoiceSnapshot() fetches current status. Local status updated to match Xendit. | | |
| TC-BIL-013 | [N] | Create invoice for already-paid transaction | Transaction with xendit_status = 'PAID' | 1. Try to create invoice for paid transaction | System returns error: transaction already paid. No duplicate invoice created. | | |
| TC-BIL-014 | [N] | Xendit webhook with invalid token | Webhook request with wrong X-CALLBACK-TOKEN | 1. Send webhook with invalid token | Request rejected (401 or 403). Payment status not updated. | | |

### 9.4 In-Person Payment Processing

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-BIL-015 | [P] | Record cash payment | Front desk logged in, transaction exists | 1. Open PaymentSidePanel 2. Select "Cash" as payment method 3. Enter amount 4. Click "Record Payment" | POST /api/v1/payments/record returns 200. Payment recorded with payment_method = 'cash'. paid_at set. Transaction marked as paid. | | |
| TC-BIL-016 | [P] | Record card payment (in-person) | Front desk logged in, transaction exists | 1. Open PaymentSidePanel 2. Select "Card" as payment method 3. Enter amount 4. Click "Record Payment" | POST /api/v1/payments/record returns 200. Payment recorded with payment_method = 'card'. paid_at set. | | |
| TC-BIL-017 | [P] | Xendit retail outlet / e-wallet payment (GCash, etc.) | Front desk logged in | 1. Generate Xendit invoice 2. Customer pays via preferred Xendit channel (GCash, bank transfer, retail) 3. System receives webhook | Payment processed through Xendit's available payment channels. Xendit handles the payment method routing. Webhook updates local status. | | |
| TC-BIL-018 | [N] | Record payment with amount exceeding balance | Transaction balance = PHP 500 | 1. Enter payment amount = PHP 1000 2. Submit | System validates amount <= balance. Returns error or warning for overpayment. | | |
| TC-BIL-019 | [N] | Record payment with zero or negative amount | Payment form open | 1. Enter amount = 0 or -100 2. Submit | POST /api/v1/payments/record returns 422. Validation error. | | |

### 9.5 Receipts

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-BIL-020 | [P] | Issue official receipt after payment | Payment recorded | 1. After payment, click "Print Receipt" 2. View/print receipt | Receipt generated with: shop_name, shop_address, transaction ID, job_order_no, payment_method, amount_paid, date/time, line items (service + parts breakdown), customer info, vehicle info. | | |
| TC-BIL-021 | [P] | View receipt from billing queue | Payment receipt exists | 1. Open billing queue 2. Click on a paid transaction 3. View receipt detail | GET /api/v1/billing/receipts/{transactionId} returns 200. CustomerBillingReceiptResource with full receipt data including computed line items from service_fee and parts. | | |
| TC-BIL-022 | [P] | Print receipt (POS receipt printer) | Receipt generated | 1. Click "Print" 2. Browser print dialog or thermal printer | Receipt formatted for printing. receipt-print.ts utility formats data for print layout. | | |

### 9.6 Financial Records & Audit

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-BIL-023 | [P] | Verify audit logging for billing | Transaction created or updated | 1. Perform any billing operation 2. Check audit log / archives | Archive entry created with entity_type, entity_id, action, old_data, new_data, user_id, reference_number. | | |
| TC-BIL-024 | [P] | View archives for billing transactions | Billing archives exist | 1. Navigate to archives 2. Filter by entity_type = transaction | GET /api/v1/archives returns 200. Filtered billing archives displayed. | | |
| TC-BIL-025 | [P] | Update financial records after payment | Payment completed | 1. Check customer's total_spent 2. Check transaction status | Customer's total_spent updated. Transaction marked as settled/paid. Financial records reflect payment. | | |

---

## 10. Point of Sale

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Point of Sale*** |
| **Module Code:** | POS |

### 10.1 POS Cart Operations

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-POS-001 | [P] | Search/scan item in POS | Inventory items exist | 1. Navigate to /pos 2. Type item name or SKU in search bar 3. Select matching item | Item details displayed (name, SKU, unit_price, available stock). Item ready to add to cart. | | |
| TC-POS-002 | [P] | Add item to POS cart | Item selected | 1. Click "Add to Cart" or select item 2. Set quantity 3. Item appears in cart | Cart updated. Line item shows: item_name, quantity, unit_price, subtotal. Running total updated. | | |
| TC-POS-003 | [P] | Add multiple items to cart | Multiple items exist | 1. Search and add Item A (qty 2) 2. Search and add Item B (qty 1) | Both items in cart. Total = sum of all subtotals. Each line item independently editable/removable. | | |
| TC-POS-004 | [P] | Update cart item quantity | Items in cart | 1. Change quantity of an item 2. Cart recalculates | Line subtotal updated. Cart total recalculated. | | |
| TC-POS-005 | [P] | Remove item from cart | Items in cart | 1. Click remove/delete on a cart item 2. Confirm | Item removed from cart. Cart total updated. | | |
| TC-POS-006 | [N] | Add item with quantity exceeding available stock | Item has available_stock = 3 | 1. Try to add quantity = 10 2. Add to cart | System warns or prevents: requested quantity exceeds available stock. | | |
| TC-POS-007 | [E] | Add item with zero quantity | Item selected | 1. Set quantity = 0 2. Try to add | Item not added or validation error. | | |
| TC-POS-008 | [E] | Empty cart checkout attempt | Cart is empty | 1. Click "Checkout" with empty cart | System prevents checkout. Message: "Cart is empty" or checkout button disabled. | | |

### 10.2 POS Checkout

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-POS-009 | [P] | POS checkout with cash payment | Items in cart | 1. Click "Checkout" 2. Select payment_method = 'cash' 3. Enter amount tendered 4. Confirm | POST /api/v1/pos/checkout returns 200. Inventory deducted for each item. Payment transaction recorded. Receipt generated. POS transaction history updated. | | |
| TC-POS-010 | [P] | POS checkout with card payment | Items in cart | 1. Click "Checkout" 2. Select payment_method = 'card' 3. Confirm | POST /api/v1/pos/checkout returns 200. Payment marked as paid immediately (in-person card). Inventory deducted. | | |
| TC-POS-011 | [P] | POS checkout with online payment (Xendit) | Items in cart | 1. Click "Checkout" 2. Select payment_method = 'online' or 'xendit' 3. Confirm | POST /api/v1/pos/checkout returns 200. Xendit invoice created. payment_url returned. Inventory deducted. Transaction status = pending until webhook confirms. | | |
| TC-POS-012 | [P] | Select payment method before checkout | Items in cart | 1. Click payment method selector 2. Choose Cash, Card, or Online | Selected payment method highlighted. Checkout flow adapts to selection (cash: enter amount; card: immediate; online: generate link). | | |
| TC-POS-013 | [P] | Generate POS receipt after checkout | Checkout completed | 1. After successful checkout 2. Click "Print Receipt" | Receipt generated with POS items, quantities, prices, total, payment method, date/time, transaction reference number. | | |

### 10.3 POS Transaction History

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-POS-014 | [P] | View POS transaction history | POS transactions exist | 1. Navigate to POS history/transactions tab 2. Filter by date | GET /api/v1/pos/transactions returns 200. Paginated list of past POS transactions with items, totals, payment methods, timestamps. | | |
| TC-POS-015 | [P] | Generate daily sales summary | POS sales exist for today | 1. View POS dashboard 2. Check daily summary | Daily sales total calculated. Breakdown by payment method. Transaction count displayed. | | |

### 10.4 POS Error Handling

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-POS-016 | [N] | Handle failed Xendit invoice creation | Xendit API unavailable or error | 1. Checkout with online payment 2. Xendit invoice creation fails | Error message displayed to cashier. Cart preserved. Option to retry or switch payment method. | | |
| TC-POS-017 | [N] | Handle inventory deduction failure during checkout | Item stock changed between cart add and checkout | 1. Add item to cart 2. Another user purchases last stock 3. Try to checkout | System detects insufficient stock. Error: "Item X no longer available in requested quantity." Cart updated. | | |

---

## 11. Reports & Analytics

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Reports & Analytics*** |
| **Module Code:** | RPT |

### 11.1 Report Generation

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-RPT-001 | [P] | Generate daily usage report | Inventory transactions exist for the date | 1. Navigate to Reports 2. Select "Daily Usage Report" 3. Choose date 4. Click "Generate" | POST /api/v1/reports/daily-usage returns 201. Report created with report_type = 'daily_usage', report_date set, data_summary with usage breakdown. Report appears in report list. | | |
| TC-RPT-002 | [P] | Generate monthly procurement report | Procurement data exists for the month | 1. Select "Monthly Procurement Report" 2. Choose year and month 3. Click "Generate" | POST /api/v1/reports/monthly-procurement returns 201. Report with procurement totals, top items, supplier breakdown for the specified month. | | |
| TC-RPT-003 | [P] | Generate reconciliation report | Stock movements exist in date range | 1. Select "Reconciliation Report" 2. Choose start_date and end_date 3. Click "Generate" | POST /api/v1/reports/reconciliation returns 201. Report reconciling all stock movements: opening stock, additions (procurement, returns), deductions (sales, damage, reservations), closing stock, net change. | | |
| TC-RPT-004 | [N] | Generate daily report for future date | Selected date is tomorrow | 1. Select tomorrow's date 2. Try to generate | POST /api/v1/reports/daily-usage returns 422. Error: cannot generate report for future date. | | |
| TC-RPT-005 | [N] | Generate report with invalid date range | end_date before start_date | 1. Set start_date = 2026-05-15, end_date = 2026-05-10 2. Generate | POST returns 422. Validation error: end_date must be after start_date. | | |

### 11.2 View & Export Reports

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-RPT-006 | [P] | View report list | Reports exist | 1. Navigate to Reports page 2. Browse report list 3. Filter by report_type, date range | GET /api/v1/reports returns 200. Paginated report list. ReportResource includes report_type, generated_date, report_date, data_summary preview. | | |
| TC-RPT-007 | [P] | View report detail | Report exists | 1. Click on a report 2. View full data_summary | GET /api/v1/reports/{id} returns 200. Full report with all data_summary fields expanded. | | |
| TC-RPT-008 | [P] | Export report as CSV | Report exists | 1. Open report 2. Click "Export CSV" | GET /api/v1/reports/{id}/export?format=csv returns 200. CSV file downloaded with report data. | | |
| TC-RPT-009 | [P] | Export report as PDF | Report exists | 1. Open report 2. Click "Export PDF" | GET /api/v1/reports/{id}/export?format=pdf returns 200. PDF file downloaded. | | |
| TC-RPT-010 | [E] | Export non-existent report | Report ID does not exist | 1. Request export for invalid report ID | GET /api/v1/reports/{id}/export returns 404. Error: report not found. | | |

### 11.3 Dashboard & Analytics

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-RPT-011 | [P] | View dashboard analytics | Data exists across modules | 1. Navigate to dashboard 2. View KPI cards | GET /api/v1/reports/analytics/dashboard returns 200. DashboardAnalytics includes: total_inventory_value, low_stock_count, pending_job_orders, completed_today, monthly_revenue_trend, jobs_by_status breakdown. | | |
| TC-RPT-012 | [P] | View usage analytics with date range | Usage data exists | 1. Navigate to Reports > Usage Analytics 2. Select date range 3. View charts | GET /api/v1/reports/analytics/usage?start_date=&end_date= returns 200. Usage trends, top consumed items, consumption by category. | | |
| TC-RPT-013 | [P] | View procurement analytics | Procurement data exists | 1. Navigate to Reports > Procurement Analytics 2. Select date range | GET /api/v1/reports/analytics/procurement?start_date=&end_date= returns 200. Procurement trends, top supplied items, supplier breakdown, cost analysis. | | |
| TC-RPT-014 | [P] | Dashboard summary display (KPI widgets) | Dashboard page loaded | 1. Front desk: View /dashboard 2. Admin: View /admin | Dashboard KPI cards show: active jobs count, today's revenue, pending approvals, low stock alerts count, recent transactions. Data from getDashboardAnalytics(). | | |
| TC-RPT-015 | [P] | Archive reports for audit | Reports exist | 1. Reports automatically stored in reports table 2. Archives created for key events | Report data persisted. Archive entries created for report generation events. Reports queryable by date range via betweenDates scope. | | |

---

## 12. Alerts & Notifications

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Alerts & Notifications System*** |
| **Module Code:** | ALT |

### 12.1 View & Filter Alerts

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-ALT-001 | [P] | View all alerts with filters | Alerts exist | 1. Navigate to alerts/notifications 2. Filter by acknowledged, urgency (critical/high/medium/low), alert_type | GET /api/v1/alerts returns 200. Paginated AlertResource with alert_type, urgency, message, acknowledged status, nested inventory info. | | |
| TC-ALT-002 | [P] | View alert statistics | Alerts exist | 1. Navigate to alert dashboard 2. View statistics panel | GET /api/v1/alerts/statistics returns 200. Counts by urgency, type, acknowledged vs unacknowledged. | | |
| TC-ALT-003 | [E] | View empty alert list | No alerts exist | 1. Navigate to alerts page | Empty state displayed. No errors. Statistics show zero counts. | | |

### 12.2 Alert Generation

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-ALT-004 | [P] | Auto-generate low stock alert on stock deduction | Item stock drops below reorder_level after deduction | 1. Deduct stock from item near reorder threshold 2. Check alerts | LowStockAlert event fired. HandleLowStockAlert listener creates/updates Alert record. urgency set based on stock vs reorder ratio (critical: 0%, high: <25%, medium: <50%). | | |
| TC-ALT-005 | [P] | Manually generate low stock alerts | Low stock items exist | 1. Click "Generate Low Stock Alerts" 2. System scans inventory | POST /api/v1/alerts/generate-low-stock returns 200. AlertService scans all items. Uses firstOrCreate to avoid duplicates. Returns list of created/updated alerts. | | |
| TC-ALT-006 | [P] | Deduplication of alerts | Alert already exists for item | 1. Generate alerts twice for same low-stock item | Only one alert record per item. findExistingLowStockAlert prevents duplicates. Existing alert updated if stock changed further. | | |
| TC-ALT-007 | [E] | Out-of-stock alert (stock = 0) | Item stock drops to zero | 1. Sell last unit of an item 2. Check alerts | Alert created with alert_type = 'out_of_stock', urgency = 'critical'. | | |

### 12.3 Alert Management

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-ALT-008 | [P] | Acknowledge single alert | Unacknowledged alert exists | 1. Select alert 2. Click "Acknowledge" 3. Optionally add notes | PUT /api/v1/alerts/{id}/acknowledge returns 200. acknowledged = true. acknowledged_by set. acknowledged_at timestamped. | | |
| TC-ALT-009 | [P] | Bulk acknowledge alerts | Multiple unacknowledged alerts | 1. Select multiple alerts via checkboxes 2. Click "Acknowledge Selected" | POST /api/v1/alerts/bulk-acknowledge returns 200. All selected alerts acknowledged. acknowledged_by set for each. | | |
| TC-ALT-010 | [P] | Cleanup old acknowledged alerts | Old acknowledged alerts exist (30+ days) | 1. Click "Cleanup Old Alerts" or auto-cleanup runs | DELETE /api/v1/alerts/cleanup returns 200. Acknowledged alerts older than 30 days deleted. cleanupAlerts() returns count of deleted alerts. | | |
| TC-ALT-011 | [N] | Acknowledge already acknowledged alert | Alert already acknowledged | 1. Try to acknowledge again | System returns success (idempotent) or shows alert already acknowledged. No error. | | |

---

## 13. Customer Self-Service Portal

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Customer Self-Service Portal*** |
| **Module Code:** | CSP |

### 13.1 Browse & Book Services

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-CSP-001 | [P] | Browse available services | Customer logged in | 1. Navigate to /customer/services 2. Browse service catalog 3. Filter by category (maintenance, cleaning, repair) | GET /api/v1/services returns 200. Active services displayed with name, price, duration, rating, recommended flag. ServiceCatalogResource format. | | |
| TC-CSP-002 | [P] | View service detail with features | Service exists | 1. Click on a service 2. View detail page | GET /api/v1/services/{id} returns 200. Features list, includes list, estimated duration, price breakdown, rating, reviews count. | | |
| TC-CSP-003 | [P] | Check booking slot availability | Booking slots configured, date selected | 1. Select a service 2. Choose a date 3. View available time slots | GET /api/v1/customer/availability?date=YYYY-MM-DD returns 200. BookingAvailability with time slots, each showing capacity and current booking count. Full slots marked unavailable. | | |
| TC-CSP-004 | [P] | Book service (pay later / pay at shop) | Available slot exists | 1. Select date and time slot 2. Choose vehicle 3. Add notes 4. Select "Pay at Shop" 5. Confirm booking | POST /api/v1/customer/book returns 201. JobOrder created with source = 'online_booking', status = 'created'. reservation_expires_at set based on config (60 min unpaid hold). | | |
| TC-CSP-005 | [P] | Book service with online payment (Xendit) | Available slot exists | 1. Select date, time slot, vehicle 2. Select "Pay Online" 3. Confirm | POST /api/v1/customer/book-with-payment returns 201. JobOrder created. Xendit invoice generated. Customer redirected to payment_url. reservation_expires_at set to longer hold (1440 min / 24h). | | |
| TC-CSP-006 | [N] | Book fully-booked time slot | All slot capacity used | 1. Select date 2. View time slots 3. Try to book full slot | Slot shown as unavailable. POST returns 422: slot capacity exceeded. | | |
| TC-CSP-007 | [N] | Book without selecting vehicle | Booking form open, customer has vehicles | 1. Fill form 2. Leave vehicle unselected 3. Submit | POST returns 422. Error: vehicle_id is required. | | |

### 13.2 My Services (View & Manage Bookings)

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-CSP-008 | [P] | View my job orders / bookings | Customer has bookings | 1. Navigate to /customer/my-services 2. View booking list | GET /api/v1/customer/job-orders returns 200. Customer's JOs with status, service, date, time. Job orders without schedule show appropriate messaging. | | |
| TC-CSP-009 | [P] | Reschedule a booking | JO in modifiable status, new slot available | 1. Select booking 2. Click "Reschedule" 3. Choose new date and time 4. Confirm | PATCH /api/v1/customer/job-orders/{id}/reschedule returns 200. arrival_date and arrival_time updated. | | |
| TC-CSP-010 | [P] | Cancel a booking (customer) | JO in cancellable status | 1. Select booking 2. Click "Cancel Booking" 3. Provide reason 4. Confirm | DELETE /api/v1/customer/job-orders/{id}/cancel returns 200. JO status set to 'cancelled'. Resources released if allocated. | | |
| TC-CSP-011 | [N] | Cancel booking in non-cancellable status | JO in 'in_progress' or 'completed' | 1. Try to cancel an in-progress job | System returns 422. Error: cannot cancel job in current status. State machine validation. | | |
| TC-CSP-012 | [P] | View booking receipt/invoice URL | Booking has associated transaction | 1. Select booking 2. Click "View Receipt" | GET /api/v1/customer/job-orders/{id}/receipt-url returns 200. Returns receipt/invoice URL or payment_url if pending. | | |

### 13.3 Customer Shop (Parts Purchase)

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-CSP-013 | [P] | Browse shop items | Inventory has active items | 1. Navigate to /customer/shop 2. Browse available parts/products | Product list displayed with item_name, unit_price, available stock, category. | | |
| TC-CSP-014 | [P] | Shop checkout via Xendit | Items in cart | 1. Add items to cart 2. Click "Checkout" 3. Proceed with online payment | POST /api/v1/shop/checkout returns 200. Xendit invoice created for cart total. payment_url returned. | | |
| TC-CSP-015 | [P] | Shop checkout with pay-at-shop option | Items in cart | 1. Add items to cart 2. Select "Pay at Shop" 3. Confirm | POST /api/v1/shop/pay-at-shop returns 200. Order created with "pay at shop" flag. Customer pays in person later. | | |
| TC-CSP-016 | [E] | Shop with empty cart | No items selected | 1. Click "Checkout" with empty cart | Checkout prevented. Message: add items to cart first. | | |

### 13.4 Customer Billing & Payment

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-CSP-017 | [P] | View my billing summary | Customer has billing records | 1. Navigate to /customer/billing 2. View summary | GET /api/v1/customer/billing/summary returns 200. Total outstanding balance, last payment info, payment history overview. BillingSummary with BillingSummaryLastPayment. | | |
| TC-CSP-018 | [P] | View my billing receipts | Receipts exist | 1. Navigate to billing 2. Click "Receipts" tab 3. Filter/search | GET /api/v1/customer/billing/receipts returns 200. Paginated CustomerBillingReceipt list with search and date filters. | | |
| TC-CSP-019 | [P] | View single receipt detail | Receipt exists | 1. Click on a receipt 2. View detail | GET /api/v1/customer/billing/receipts/{transactionId} returns 200. Full receipt: job_order_no, payment_method, amount_paid, line items, customer/vehicle info. | | |
| TC-CSP-020 | [P] | View my transactions | Customer has transactions | 1. Navigate to billing/payment 2. View transaction history | GET /api/v1/customer/transactions returns 200. Paginated CustomerTransaction list with type, amount, payment_method, xendit_status, paid_at. | | |

---

## 14. Admin Management

| Group Name: | Binignit Boys |
| :---- | :---- |
| **Module Name:** | ***Admin Management*** |
| **Module Code:** | ADM |

### 14.1 Front Desk Account Management

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-ADM-001 | [P] | View front desk accounts list | Admin logged in | 1. Navigate to /admin/frontdesk-accounts 2. View accounts | GET /api/v1/admin/frontdesk-accounts returns 200. List of users with role = 'frontdesk'. | | |
| TC-ADM-002 | [P] | Create new front desk account | Admin logged in | 1. Click "Add Account" 2. Fill name, email, password, phone_number, address 3. Role auto-set as frontdesk 4. Submit | POST /api/v1/admin/frontdesk-accounts returns 201. New User created with role = 'frontdesk'. | | |
| TC-ADM-003 | [P] | Delete front desk account | Front desk account exists | 1. Select account 2. Click "Delete" 3. Confirm | DELETE /api/v1/admin/frontdesk-accounts/{id} returns 200. Account removed. | | |
| TC-ADM-004 | [N] | Create front desk account with existing email | Another user has same email | 1. Fill form with duplicate email 2. Submit | POST returns 422. Error: email already taken. | | |
| TC-ADM-005 | [N] | Non-admin attempts to access admin routes | Front desk or customer logged in | 1. Navigate to /admin/frontdesk-accounts | Redirected to role home. 403 Forbidden on API. | | |
| TC-ADM-006 | [N] | Admin delete own account | Admin logged in | 1. Try to delete own admin account | System prevents self-deletion or returns error. | | |

### 14.2 Booking Slot Configuration

| Test Case ID | Type | Scenario | Precondition | Test Steps | Expected Result | Test Result | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-ADM-007 | [P] | View booking slot settings | Admin logged in | 1. Navigate to /admin/booking-slots 2. View current slot configuration | GET /api/v1/admin/booking-slots returns 200. All BookingSlot records with time, capacity, is_active, sort_order. | | |
| TC-ADM-008 | [P] | Update booking slots (add/modify/delete) | Admin logged in | 1. Add new time slot (time, capacity) 2. Modify existing slot capacity 3. Deactivate a slot (is_active = false) 4. Save all changes | PUT /api/v1/admin/booking-slots returns 200. BookingSlot records upserted. Deactivated slots omitted from availability queries (active scope). Slots ordered by sort_order. | | |
| TC-ADM-009 | [P] | Set slot capacity | Admin logged in | 1. Edit a time slot 2. Set capacity = 3 3. Save | Slot now allows up to 3 concurrent bookings. Availability check reflects updated capacity. | | |
| TC-ADM-010 | [N] | Set negative slot capacity | Admin logged in | 1. Set capacity = -1 2. Save | PUT returns 422. Error: capacity must be non-negative integer. | | |

---

## Appendix A: Test Data Reference

### Demo Accounts (from DemoAccountSeeder)
| Role | Email | Password | Default Page |
|------|-------|----------|-------------|
| Admin | admin@aliencare.test | AlienCare123! | /admin |
| Front Desk | frontdesk@aliencare.test | AlienCare123! | /dashboard |
| Customer | customer@aliencare.test | AlienCare123! | /customer |

### Service Catalog (from ServiceCatalogSeeder)
| Name | Category | Price |
|------|----------|-------|
| Premium Car Wash | Cleaning | PHP 550.00 |
| Change Oil | Maintenance | PHP 1,200.00 |
| Air-Con Repair | Repair | PHP 2,500.00 |
| Brake Inspection | Maintenance | PHP 800.00 |
| Full Detail | Cleaning | PHP 2,000.00 |
| Battery Replacement | Repair | PHP 4,500.00 |

### Job Order State Machine (JobOrderStatus)
```
Created ──→ PendingApproval ──→ Approved ──→ InProgress ──→ Completed ──→ Settled
   │              │                 │              │
   └──────────────┴─────────────────┴──────────────┘
                        │
                      Cancelled
```
**Valid transitions:**
- Created → PendingApproval, Cancelled
- PendingApproval → Approved, Cancelled
- Approved → InProgress, Cancelled
- InProgress → Completed, Cancelled
- Completed → Settled
- Settled → (terminal, no transitions)
- Cancelled → (terminal, no transitions)

**Modifiable states** (can add/edit/remove items): Created, PendingApproval, Approved, InProgress

### Reservation Lifecycle
```
Pending ──→ Approved ──→ Completed
  │            │
  ├──→ Rejected│
  └──→ Cancelled│
               └──→ Cancelled (stock restored)
```

### Key Payment Methods
| Method | Processing | Use Case |
|--------|-----------|----------|
| Cash | Immediate (manual record) | In-person at front desk or POS |
| Card (in-person) | Immediate (manual record) | In-person at front desk or POS |
| Xendit Invoice | Asynchronous (webhook) | Online payment, GCash, bank transfer, retail outlets |
| Pay-at-Shop | Deferred (pay later) | Customer booking, confirmed at shop |

---

## Appendix B: API Endpoint Quick Reference

### Public (No Auth)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/v1/services | List active services |
| GET | /api/v1/services/{id} | View service detail |
| POST | /api/v1/customers/register | Public customer self-registration |
| POST | /api/v1/payments/webhook | Xendit payment callback |
| GET | /api/health | Health check |

### Auth
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /auth/register | Register user account |
| POST | /auth/login | Login |
| POST | /auth/logout | Logout |
| POST | /auth/forgot-password | Request password reset |
| POST | /auth/reset-password | Reset password |

### Settings
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/settings/profile | View profile |
| PATCH | /api/settings/profile | Update profile |
| DELETE | /api/settings/profile | Delete account |
| PUT | /api/settings/password | Change password |

### Key API v1 Endpoints (Authenticated)
All under `/api/v1/` prefix with `auth:sanctum` middleware:

| Module | Key Endpoints |
|--------|--------------|
| Customers | GET/POST /customers, GET/PUT/DELETE /customers/{id}, PUT /customers/{id}/approve, PUT /customers/{id}/reject, GET /customers/{id}/audit-log, GET /customers/{id}/transactions, GET /customers/{id}/vehicles, GET /customers/{id}/job-orders |
| Vehicles | GET/POST /vehicles, PUT /vehicles/{id}, PUT /vehicles/{id}/approve, DELETE /vehicles/{id} |
| Job Orders | GET/POST /job-orders, GET/PUT /job-orders/{id}, PUT /job-orders/{id}/submit, PUT /job-orders/{id}/approve, PUT /job-orders/{id}/start, PUT /job-orders/{id}/complete, PUT /job-orders/{id}/settle, DELETE /job-orders/{id}/cancel, POST/PUT/DELETE /job-orders/{id}/items |
| Inventory | GET/POST /inventory, GET/PUT/DELETE /inventory/{id}, GET /inventory/{id}/stock-status, POST /inventory/add-stock, POST /inventory/deduct-stock, POST /inventory/log-return-damage |
| Reservations | GET /reservations, POST /reservations/reserve, POST /reservations/reserve-multiple, PUT /reservations/{id}/approve, PUT /reservations/{id}/reject, PUT /reservations/{id}/complete, PUT /reservations/{id}/cancel, POST /reservations/{id}/pay-fee |
| Payments | POST /payments/pay-all, POST /payments/sync, POST /payments/frontdesk/invoice, POST /payments/record, POST /payments/frontdesk/sync, POST /payments/{transactionId}/invoice |
| Billing | GET /billing/queue, GET /billing/receipts/{transactionId} |
| POS | GET /pos/transactions, POST /pos/checkout |
| Reports | GET/POST /reports, GET /reports/{id}, GET /reports/{id}/export, POST /reports/daily-usage, POST /reports/monthly-procurement, POST /reports/reconciliation, GET /reports/analytics/dashboard, GET /reports/analytics/usage, GET /reports/analytics/procurement |
| Alerts | GET /alerts, GET /alerts/statistics, POST /alerts/generate-low-stock, PUT /alerts/{id}/acknowledge, POST /alerts/bulk-acknowledge, DELETE /alerts/cleanup |
| Services | GET /services/manage, POST /services, PUT /services/{id}, DELETE /services/{id} |
| Mechanics | GET /mechanics |
| Bays | GET /bays |
| Archives | GET /archives, GET /archives/{id} |
| Transactions | GET /transactions, GET /transactions/{id} |
| Admin | GET/POST /admin/frontdesk-accounts, DELETE /admin/frontdesk-accounts/{id}, GET/PUT /admin/booking-slots |
| Customer Portal | GET /customer/onboarding-status, POST /customer/onboarding, GET /customer/availability, GET /customer/transactions, GET /customer/billing/*, GET /customer/job-orders, PATCH /customer/job-orders/{id}/reschedule, DELETE /customer/job-orders/{id}/cancel, POST /customer/book, POST /customer/book-with-payment |
| Shop | POST /shop/checkout, POST /shop/pay-at-shop |

---

## Summary

| Module | Test Case Count | Status |
|--------|----------------|--------|
| 1. Authentication & Authorization | 23 | NEW |
| 2. User Profile & Settings | 8 | NEW |
| 3. Customer Information Management | 29 | EXPANDED (from 9) |
| 4. Vehicle Management | 10 | NEW |
| 5. Service Catalog Management | 10 | NEW |
| 6. Job Order Management | 33 | EXPANDED (from 7) |
| 7. Inventory Management | 25 | EXPANDED (from 10) |
| 8. Parts Reservation Management | 15 | NEW |
| 9. Billing & Payment System | 25 | EXPANDED & CORRECTED (from 8) |
| 10. Point of Sale | 17 | EXPANDED (from 10) |
| 11. Reports & Analytics | 15 | EXPANDED (from 7) |
| 12. Alerts & Notifications | 11 | NEW |
| 13. Customer Self-Service Portal | 20 | NEW |
| 14. Admin Management | 10 | NEW |
| **TOTAL** | **251** | **Up from 51** |

### Key Corrections Made:
1. **"Card Payment via Stripe"** → Corrected to **"Card Payment via Xendit"** — the codebase exclusively uses Xendit (`backend/config/xendit.php`, `XenditService.php`)
2. **"GCash Payment Processing"** → Revised to **"Xendit retail outlet / e-wallet payment"** — GCash is handled as one of Xendit's payment channels, not a standalone integration
3. **"Prepare Invoice Draft" (marked Fail)** → Removed as a standalone test case. Invoice generation is not a separate step in the actual codebase workflow — invoices are created as part of payment/settlement (POST /payments/{id}/invoice, POST /payments/frontdesk/invoice). The correct test cases are under Billing sections TC-BIL-004 through TC-BIL-008
4. **"Forecast Revenue Trends"** → Removed as a standalone manual action. Demand forecasting exists in the codebase (`InventoryService.forecastDemand()`) but is an analytical feature within the inventory dashboard, not a user-triggered action for revenue
5. **Added "Precondition" and "Test Steps" columns** to all test cases for professional QA traceability
6. **Added test case type classification** ([P] Positive, [N] Negative, [E] Edge Case) for test planning
7. **Added unique test case IDs** (TC-XXX-NNN) for traceability in test management tools
