# AlienCare AutoShop - Inventory Management System

A professional-grade inventory and reservation management system built with a separated frontend/backend architecture.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Laravel 12, PHP 8.2+ |
| Frontend | React 19, TypeScript, React Router |
| Styling | Tailwind CSS 4, shadcn/ui, Radix UI |
| Database | SQLite (dev) / MySQL 8+ (prod) |
| Authentication | Laravel Sanctum (SPA cookie auth) |
| Testing | Pest PHP, Vitest |
| Build | Vite 7 |

## Project Structure

```
project-root/
├── frontend/                    # React SPA (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── shared/          # Reusable app components
│   │   │   ├── layout/          # App, Auth, Settings layouts
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   └── inventory/       # Inventory feature components
│   │   ├── pages/
│   │   │   ├── auth/            # Login, Register, etc.
│   │   │   ├── dashboard/       # Dashboard, Inventory
│   │   │   └── settings/        # Profile, Password, Appearance
│   │   ├── hooks/               # Custom React hooks
│   │   ├── context/             # React Context providers
│   │   ├── services/            # API client & service layer
│   │   ├── router.tsx           # Route guards
│   │   ├── App.tsx              # Route definitions
│   │   └── main.tsx             # Entry point
│   ├── .env
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                     # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   ├── Models/
│   │   ├── Services/
│   │   ├── Repositories/
│   │   ├── Contracts/
│   │   └── Enums/
│   ├── routes/api.php
│   ├── database/
│   ├── tests/
│   ├── .env
│   └── composer.json
│
└── README.md
```

## Prerequisites

- PHP 8.2 or higher
- Composer 2.x
- Node.js 18+ and npm
- SQLite (for development) or MySQL 8+ (for production)

## Local Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AlienCare-AutoShop
```

### 2. Backend Setup

```bash
cd backend

# Install PHP dependencies
composer install

# Copy environment file and generate key
cp .env.example .env
php artisan key:generate

# Create SQLite database and run migrations
touch database/database.sqlite
php artisan migrate

# (Optional) Seed with sample data
php artisan db:seed
```

### Xendit Security Checklist

- Set `XENDIT_SECRET_KEY` to a valid Xendit **secret** API key (never `xnd_public_*`).
- Keep `XENDIT_WEBHOOK_TOKEN` present in `backend/.env` and ensure it exactly matches the webhook token configured in your Xendit dashboard.
- If Xendit credentials are exposed, rotate `XENDIT_SECRET_KEY` and `XENDIT_WEBHOOK_TOKEN` in Xendit first, then update `backend/.env`.
- If you update env values after the app is already booted, refresh Laravel config:

If keys are missing, placeholders, or mis-typed, payment endpoints will return `503` until configuration is corrected.

```bash
cd backend
php artisan config:clear

# Run this too in environments that use cached config.
php artisan config:cache
```

Seeded demo access after running `php artisan db:seed`:

| Role       | Email                         | Password        | Dashboard         |
|------------|-------------------------------|-----------------|-------------------|
| Admin      | `admin@aliencare.test`        | `AlienCare123!` | `/admin`          |
| Front Desk | `frontdesk@aliencare.test`    | `AlienCare123!` | `/dashboard`      |
| Customer   | `customer@aliencare.test`     | `AlienCare123!` | `/customer`       |

Sign-up via the register page defaults to the **customer** role.

### 3. Frontend Setup

```bash
cd frontend

# Install JavaScript dependencies
npm install
```

### 4. Start Development Servers

Run both servers (from project root):

```bash
# Terminal 1: Backend (port 8000)
cd backend && php artisan serve

# Terminal 2: Frontend (port 5173)
cd frontend && npm run dev
```

Visit `http://localhost:5173` in your browser.

## Running Tests

```bash
# Backend tests
cd backend && composer test

# Frontend tests
cd frontend && npm run test
```

## Code Quality

```bash
# Backend
cd backend
composer lint          # Run Laravel Pint
composer lint:check    # Check without fixing

# Frontend
cd frontend
npm run lint           # ESLint
npm run format         # Prettier
npm run types          # TypeScript check
```

## API Overview

The API is versioned at `/api/v1/`. Authentication uses Laravel Sanctum with SPA cookie auth.

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/logout` | Logout (auth required) |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/user` | Get current user (auth required) |

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

### Protected Endpoints (require `auth:sanctum`)

#### Inventory Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/inventory` | List all inventory items |
| POST | `/api/v1/inventory` | Create new inventory item |
| GET | `/api/v1/inventory/{id}` | Get specific item |
| PUT | `/api/v1/inventory/{id}` | Update item |
| DELETE | `/api/v1/inventory/{id}` | Delete item |
| POST | `/api/v1/inventory/add-stock` | Add stock (procurement) |
| POST | `/api/v1/inventory/deduct-stock` | Deduct stock (sales) |

#### Reservations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reservations` | List reservations |
| POST | `/api/v1/reservations/reserve` | Reserve parts for job |
| PUT | `/api/v1/reservations/{id}/approve` | Approve reservation |
| PUT | `/api/v1/reservations/{id}/complete` | Complete reservation |

#### Reports, Alerts, Transactions, Archives

See `backend/routes/api.php` for the complete route list.

## Architecture

### Backend Design Patterns

- **Repository Pattern**: Database queries abstracted in `app/Repositories/`
- **Service Layer**: Business logic in `app/Services/`
- **Interface Contracts**: Services/repos implement interfaces in `app/Contracts/`
- **Form Requests**: Input validation in `app/Http/Requests/`
- **API Resources**: Response transformation in `app/Http/Resources/`
- **Event System**: `StockUpdated`, `LowStockAlert`, `ReservationUpdated`

### Frontend Architecture

- **React Router**: Client-side routing with protected/guest route guards
- **Auth Context**: Centralized authentication state management
- **Service Layer**: API calls abstracted in `src/services/`
- **Custom Hooks**: Data fetching hooks in `src/hooks/`
- **shadcn/ui**: Component library built on Radix UI primitives

## License

This project is proprietary software. All rights reserved.
