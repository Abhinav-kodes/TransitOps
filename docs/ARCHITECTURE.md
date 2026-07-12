# TransitOps — System Architecture

> Enterprise Fleet & Transport Operations Platform  
> Version 0.1.0 | Built with React 19 + FastAPI + PostgreSQL

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Project Structure](#2-project-structure)
3. [Infrastructure & Docker](#3-infrastructure--docker)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Schema](#5-database-schema)
6. [Authentication & RBAC](#6-authentication--rbac)
7. [API Reference](#7-api-reference)
8. [Frontend Architecture](#8-frontend-architecture)
9. [External Integrations](#9-external-integrations)
10. [Business Logic & Workflows](#10-business-logic--workflows)
11. [Environment Variables](#11-environment-variables)

---

## 1. High-Level Overview

TransitOps is a full-stack fleet management platform that provides real-time visibility into vehicles, drivers, trips, fuel expenditure, maintenance, and compliance. It follows a **layered architecture** with clear separation between presentation (React), business logic (FastAPI), and data persistence (PostgreSQL).

```
┌──────────────────────────────────────────────────────────┐
│                      BROWSER (SPA)                       │
│         React 19 · Vite 8 · Tailwind 4 · shadcn/ui      │
│         i18next (EN/HI) · Recharts · React Router 7      │
└────────────────────────┬─────────────────────────────────┘
                         │  HTTP / JSON
                         ▼
┌──────────────────────────────────────────────────────────┐
│                   FASTAPI (port 8000)                     │
│     SQLModel ORM · PyJWT · Argon2/Bcrypt · asyncpg       │
│     Modules: auth · fleet · operations · finance         │
│              analytics · documents · chat                 │
└──────┬──────────────────┬──────────────────┬─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│  PostgreSQL   │  │    MinIO     │  │  External APIs   │
│  (port 5432)  │  │ (port 9002)  │  │ TollGuru · SendGrid│
│  8 tables     │  │  S3 compat   │  │ Google Gemini AI  │
└──────────────┘  └──────────────┘  └──────────────────┘
```

---

## 2. Project Structure

```
odoo/
├── docker-compose.yml          # Orchestrates all 4 services
│
├── backend/
│   ├── Dockerfile              # Python 3.11 + uv + FastAPI
│   ├── pyproject.toml          # Python dependencies (uv)
│   ├── main.py                 # FastAPI app entrypoint + CORS
│   ├── api/
│   │   ├── router.py           # Mounts all sub-routers under /api
│   │   ├── dependencies.py     # get_current_user, require_roles()
│   │   ├── authentication/
│   │   │   ├── router.py       # Login, register, role CRUD, seed
│   │   │   └── security.py     # JWT encode/decode, password hashing
│   │   ├── fleet/
│   │   │   ├── router.py       # Vehicle & Driver CRUD + DELETE
│   │   │   └── schemas.py      # Pydantic request/response models
│   │   ├── operations/
│   │   │   ├── router.py       # Trip lifecycle + Maintenance CRUD
│   │   │   └── schemas.py      # Trip/Maintenance Pydantic schemas
│   │   ├── finance/
│   │   │   ├── router.py       # Fuel logs + Expenses CRUD
│   │   │   └── schemas.py
│   │   ├── analytics/
│   │   │   ├── router.py       # Dashboard KPI aggregation endpoint
│   │   │   └── schemas.py
│   │   ├── documents/
│   │   │   └── router.py       # MinIO file upload/download/delete
│   │   └── chat/
│   │       └── router.py       # Gemini AI chat assistant
│   └── packages/
│       ├── db/
│       │   ├── __init__.py     # Re-exports all models + session
│       │   ├── connection.py   # Async PostgreSQL engine + session
│       │   └── models/
│       │       ├── auth.py     # Role, User
│       │       ├── fleet.py    # Vehicle, Driver
│       │       ├── ops.py      # Trip, MaintenanceLog
│       │       └── finance.py  # FuelLog, Expense
│       └── utils/
│           ├── __init__.py     # Re-exports storage utilities
│           ├── storage.py      # MinIO upload/download/delete
│           ├── minio_client.py # MinIO client + bucket init
│           └── tollguru_client.py  # TollGuru route planning
│
├── frontend/
│   ├── Dockerfile              # Node 22 + pnpm + Vite
│   ├── package.json            # Frontend dependencies
│   ├── index.html              # Entry HTML (favicon, title)
│   ├── public/
│   │   └── favicon.png         # Company logo favicon
│   └── src/
│       ├── main.tsx            # React root + i18n init
│       ├── index.css           # Tailwind v4 imports + globals
│       ├── App.tsx             # Router + AuthProvider + guards
│       ├── lib/
│       │   ├── auth.tsx        # AuthContext, useAuth, login/logout
│       │   ├── i18n.ts         # i18next config (EN + HI)
│       │   ├── theme.tsx       # ThemeProvider (light/dark)
│       │   ├── utils.ts        # cn() utility (clsx + tw-merge)
│       │   └── exportAnalytics.ts  # PDF/CSV export with charts
│       ├── pages/
│       │   ├── LoginPage.tsx       # Split-screen login/register
│       │   ├── DashboardPage.tsx   # KPI cards + filters + charts
│       │   ├── FleetPage.tsx       # Vehicle registry table
│       │   ├── DriversPage.tsx     # Driver registry table
│       │   ├── TripsPage.tsx       # Trip planner + map + dispatch
│       │   ├── FuelExpensesPage.tsx    # Fuel & expenses tables
│       │   ├── MaintenancePage.tsx  # Maintenance registry table
│       │   ├── AnalyticsPage.tsx    # Reports + export
│       │   └── SettingsPage.tsx     # Placeholder
│       ├── components/
│       │   ├── ui/             # shadcn/ui base components
│       │   │   ├── button.tsx
│       │   │   ├── input.tsx
│       │   │   ├── label.tsx
│       │   │   ├── select.tsx
│       │   │   ├── dialog.tsx
│       │   │   └── ...
│       │   └── dashboard/
│       │       ├── Sidebar.tsx         # Role-filtered nav sidebar
│       │       ├── Header.tsx          # Search, theme, lang, user
│       │       ├── KpiGrid.tsx         # 5 KPI metric cards
│       │       ├── FilterRibbon.tsx    # Vehicle type + date filters
│       │       ├── VehicleRegistryTable.tsx
│       │       ├── DriverRegistryTable.tsx
│       │       ├── MaintenanceRegistryTable.tsx
│       │       ├── FuelExpensesContent.tsx
│       │       ├── RecentTrips.tsx
│       │       ├── VehicleStatus.tsx   # Donut chart
│       │       ├── InteractiveMap.tsx   # Google Maps polyline
│       │       ├── AddVehicleDialog.tsx
│       │       ├── AddDriverDialog.tsx
│       │       ├── AddFuelDialog.tsx
│       │       ├── AddExpenseDialog.tsx
│       │       ├── AddMaintenanceDialog.tsx
│       │       └── CompleteTripDialog.tsx
│       └── locales/
│           ├── en.json         # English translations
│           └── hi.json         # Hindi translations
│
└── docs/
    └── ARCHITECTURE.md         # This document
```

---

## 3. Infrastructure & Docker

### Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `db` | `postgres:16-alpine` | 5432 | Persistent relational data store |
| `minio` | `minio/minio:latest` | 9002 (API), 9003 (Console) | S3-compatible object storage for document uploads |
| `backend` | Custom build (Python 3.11) | 8000 | FastAPI REST API |
| `frontend` | Custom build (Node 22) | 5173 | Vite dev server with HMR |

### Networking

- `db`, `minio`, `backend` are on the `odoo_default` Docker bridge network
- `frontend` uses `network: host` for direct localhost access
- Backend connects to `db` and `minio` via Docker DNS names
- Frontend connects to backend via `VITE_API_URL=http://localhost:8000`

### Volumes

| Volume | Mount Point | Purpose |
|--------|------------|---------|
| `postgres_data` | `/var/lib/postgresql/data` | Persistent database storage |
| `minio_data` | `/data` | Persistent object storage |
| `./backend:/app` | `/app` | Live reload in development |
| `./frontend:/app` | `/app` | Live reload in development |

### Health Checks

- PostgreSQL: `pg_isready -U transitops_admin -d transitops_prod`
- Backend depends on `db` (healthy) and `minio` (started)
- Frontend depends on `backend`

---

## 4. Backend Architecture

### Framework & Libraries

| Package | Purpose |
|---------|---------|
| FastAPI 0.139 | Async ASGI web framework |
| SQLModel 0.0.39 | ORM (SQLAlchemy + Pydantic) |
| asyncpg 0.31 | Async PostgreSQL driver |
| PyJWT 2.13 | JWT token creation/verification |
| bcrypt 5.0 / argon2-cffi 25.1 | Password hashing |
| minio 7.2 | S3-compatible client for MinIO |
| httpx 0.28 | Async HTTP client (TollGuru, SendGrid) |
| pydantic-settings | Environment variable management |

### Request Lifecycle

```
Client Request
     │
     ▼
CORS Middleware (allow_origins from env)
     │
     ▼
Route Matching (/api/{module}/{endpoint})
     │
     ▼
Dependency Injection:
  ├── get_db → AsyncSession (database)
  ├── get_current_user → JWT decode + User lookup
  └── require_roles([...]) → RBAC check
     │
     ▼
Route Handler (business logic)
     │
     ▼
SQLModel ORM → asyncpg → PostgreSQL
     │
     ▼
JSON Response
```

### Module Map

| Module | Prefix | Purpose |
|--------|--------|---------|
| `authentication` | `/api/auth` | Login, register, role CRUD, seed |
| `fleet` | `/api/fleet` | Vehicle & Driver CRUD |
| `operations` | `/api/operations` | Trip lifecycle, maintenance |
| `finance` | `/api/finance` | Fuel logs, expenses |
| `analytics` | `/api/analytics` | Dashboard KPI aggregation |
| `documents` | `/api/documents` | MinIO file upload/download |
| `chat` | `/api/chat` | Gemini AI assistant |

---

## 5. Database Schema

### Entity-Relationship Diagram

```
┌───────────┐     ┌───────────┐     ┌───────────┐
│   roles    │     │   users    │     │  drivers   │
│───────────│     │───────────│     │───────────│
│ id (PK)   │◄────│ role_id   │     │ id (PK)   │
│ name      │     │ id (PK)   │────►│ user_id   │
└───────────┘     │ email     │     │ name      │
                  │ hashed_pw │     │ license_no│
                  └───────────┘     │ category  │
                                    │ expiry_dt │
                                    │ safety_scr│
                                    │ status    │
                                    └─────┬─────┘
                                          │
┌───────────┐     ┌───────────┐           │
│ vehicles   │     │   trips    │◄──────────┘
│───────────│     │───────────│
│ id (PK)   │◄────│ vehicle_id│
│ reg_no    │     │ driver_id │
│ name_model│     │ id (PK)   │
│ type      │     │ trip_code │
│ capacity  │     │ source    │
│ odometer  │     │ dest      │
│ acq_cost  │     │ cargo_wt  │
│ status    │     │ planned_d │
└─────┬─────┘     │ toll_cost │
      │           │ status    │
      │           └─────┬─────┘
      │                 │
      ├─────────┐       │
      │         │       │
┌─────┴──────┐  │  ┌────┴──────────┐
│ fuel_logs   │  │  │   expenses     │
│────────────│  │  │───────────────│
│ id (PK)    │  │  │ id (PK)       │
│ vehicle_id │  │  │ vehicle_id    │
│ date       │  │  │ trip_id       │
│ liters     │  │  │ maint_id      │
│ fuel_cost  │  │  │ toll          │
│ bill_url   │  │  │ other         │
└────────────┘  │  │ total_cost    │
                │  │ bill_url      │
┌──────────────┐│  └───────────────┘
│maintenance_l ││
│──────────────││
│ id (PK)      ││
│ vehicle_id   │◄┘
│ service_type │
│ cost         │
│ entry_date   │
│ status       │
│ bill_url     │
└──────────────┘
```

### Tables in Detail

#### `roles`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PK, auto-increment |
| `name` | ENUM | UNIQUE, NOT NULL |

Enum values: `Fleet Manager`, `Dispatcher`, `Driver`, `Safety Officer`, `Financial Analyst`, `Admin`

#### `users`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PK, auto-increment |
| `email` | VARCHAR | UNIQUE, INDEX, NOT NULL |
| `hashed_password` | VARCHAR | NOT NULL |
| `role_id` | INTEGER | FK → roles.id, INDEX, NOT NULL |

#### `vehicles`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PK, auto-increment |
| `reg_no` | VARCHAR | UNIQUE, INDEX, NOT NULL |
| `name_model` | VARCHAR(100) | NOT NULL |
| `type` | VARCHAR(50) | NOT NULL (Van, Mini, Truck) |
| `capacity_kg` | INTEGER | NOT NULL, CHECK > 0 |
| `odometer` | INTEGER | DEFAULT 0, CHECK >= 0 |
| `acq_cost` | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| `status` | ENUM | DEFAULT 'Available' |
| `document_url` | VARCHAR | NULLABLE |

Status enum: `Available`, `On Trip`, `In Shop`, `Retired`

#### `drivers`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PK, auto-increment |
| `user_id` | INTEGER | FK → users.id, NULLABLE, INDEX |
| `name` | VARCHAR(100) | NOT NULL |
| `license_no` | VARCHAR | UNIQUE, INDEX, NOT NULL |
| `category` | VARCHAR(20) | NOT NULL (LMV, HMV) |
| `expiry_date` | DATE | NOT NULL |
| `contact_no` | VARCHAR(20) | NOT NULL |
| `safety_score` | INTEGER | DEFAULT 100, CHECK 0–100 |
| `status` | ENUM | DEFAULT 'Available' |
| `license_url` | VARCHAR | NULLABLE |

Status enum: `Available`, `On Trip`, `Off Duty`, `Suspended`

#### `trips`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PK, auto-increment |
| `trip_code` | VARCHAR | UNIQUE, INDEX, NOT NULL |
| `source` | VARCHAR(255) | NOT NULL |
| `destination` | VARCHAR(255) | NOT NULL |
| `vehicle_id` | INTEGER | FK → vehicles.id, NULLABLE, INDEX |
| `driver_id` | INTEGER | FK → drivers.id, NULLABLE, INDEX |
| `cargo_weight` | INTEGER | NOT NULL, CHECK >= 0 |
| `planned_dist` | INTEGER | NOT NULL, CHECK >= 0 |
| `status` | ENUM | DEFAULT 'Draft' |
| `toll_cost` | FLOAT | DEFAULT 0.0 |

Status enum: `Draft`, `Dispatched`, `Completed`, `Cancelled`

#### `maintenance_logs`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PK, auto-increment |
| `vehicle_id` | INTEGER | FK → vehicles.id, INDEX, NOT NULL |
| `service_type` | VARCHAR(100) | NOT NULL |
| `cost` | NUMERIC(10,2) | NOT NULL |
| `entry_date` | DATE | NOT NULL |
| `status` | ENUM | DEFAULT 'Active' |
| `maintenance_bill_url` | VARCHAR | NULLABLE |

Status enum: `Active`, `Completed`

#### `fuel_logs`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PK, auto-increment |
| `vehicle_id` | INTEGER | FK → vehicles.id, INDEX, NOT NULL |
| `date` | DATE | NOT NULL |
| `liters` | NUMERIC(6,2) | NOT NULL, CHECK > 0 |
| `fuel_cost` | NUMERIC(10,2) | NOT NULL, CHECK >= 0 |
| `fuel_bill_url` | VARCHAR | NULLABLE |

#### `expenses`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | INTEGER | PK, auto-increment |
| `trip_id` | INTEGER | FK → trips.id, NULLABLE, INDEX |
| `vehicle_id` | INTEGER | FK → vehicles.id, INDEX, NOT NULL |
| `maint_id` | INTEGER | FK → maintenance_logs.id, NULLABLE, INDEX |
| `toll` | NUMERIC(8,2) | DEFAULT 0, CHECK >= 0 |
| `other` | NUMERIC(8,2) | DEFAULT 0, CHECK >= 0 |
| `total_cost` | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| `expense_bill_url` | VARCHAR | NULLABLE |

---

## 6. Authentication & RBAC

### Authentication Flow

```
┌─────────┐         ┌──────────┐         ┌──────────┐
│ Browser  │──POST──▶│ /api/auth│──verify─▶│   DB     │
│          │         │ /login   │         │  users   │
│          │◀──JWT───│          │         └──────────┘
│          │         └──────────┘
│          │
│  Store token in localStorage ("transitops-token")
│
│  Every API request includes: Authorization: Bearer <token>
│
│──GET────▶│ /api/auth/me  │──decode JWT──▶ return User + Role
└─────────┘
```

- **Token format**: JWT HS256, 30-minute expiry
- **Payload**: `{ sub: email, exp: timestamp }`
- **Password hashing**: bcrypt (with argon2-cffi available)
- **Token storage**: `localStorage["transitops-token"]`
- **Special value**: `"skip-mode"` bypasses auth (dev convenience)

### Role-Based Access Control (RBAC)

6 roles with escalating privileges:

| Role | Access Level |
|------|-------------|
| `Admin` | **Superuser** — bypasses all RBAC checks |
| `Fleet Manager` | Vehicle/driver CRUD, maintenance, full analytics |
| `Dispatcher` | Trip planning/dispatch/complete, view fleet |
| `Driver` | View assigned trips, complete trips |
| `Safety Officer` | Driver CRUD, vehicle view, analytics |
| `Financial Analyst` | Fuel/expense CRUD, analytics |

### Backend RBAC Implementation

```python
# api/dependencies.py

def require_roles(allowed_roles: List[str]):
    """Factory dependency — Admin bypasses all checks."""
    async def _check_role(current_user = Depends(get_current_user_with_role)):
        if current_user.role.name.value == "Admin":
            return current_user  # Admin bypass
        if current_user.role.name.value not in allowed_roles:
            raise HTTPException(status_code=403)
        return current_user
    return _check_role
```

### Endpoint Permission Matrix

| Endpoint | Method | Allowed Roles |
|----------|--------|---------------|
| `/api/auth/login` | POST | Public |
| `/api/auth/register` | POST | Public (excludes Admin/Fleet Manager/Safety Officer/Financial Analyst) |
| `/api/auth/roles` | GET | Public |
| `/api/auth/roles/seed` | POST | Public |
| `/api/fleet/vehicles` | POST | Fleet Manager, Admin |
| `/api/fleet/vehicles` | GET | All authenticated |
| `/api/fleet/vehicles/{id}` | PUT | Fleet Manager, Admin |
| `/api/fleet/vehicles/{id}` | DELETE | Fleet Manager, Admin |
| `/api/fleet/drivers` | POST | Fleet Manager, Safety Officer, Admin |
| `/api/fleet/drivers` | GET | All authenticated |
| `/api/fleet/drivers/{id}` | PUT | Fleet Manager, Safety Officer, Admin |
| `/api/fleet/drivers/{id}` | DELETE | Fleet Manager, Safety Officer, Admin |
| `/api/fleet/drivers/unlinked` | GET | All authenticated |
| `/api/fleet/drivers/remind-expiring` | POST | Fleet Manager, Safety Officer, Admin |
| `/api/operations/trips` | POST | Dispatcher, Admin |
| `/api/operations/trips` | GET | All authenticated |
| `/api/operations/trips/plan` | POST | Dispatcher, Driver, Admin |
| `/api/operations/trips/confirm` | POST | Dispatcher, Driver, Admin |
| `/api/operations/trips/{id}/dispatch` | PUT | Dispatcher, Admin |
| `/api/operations/trips/{id}/complete` | PUT | Dispatcher, Driver, Admin |
| `/api/operations/trips/{id}/cancel` | PUT | Dispatcher, Admin |
| `/api/operations/trips/{id}` | DELETE | Dispatcher, Admin |
| `/api/operations/maintenance` | POST | Fleet Manager, Admin |
| `/api/operations/maintenance` | GET | All authenticated |
| `/api/operations/maintenance/{id}` | DELETE | Fleet Manager, Admin |
| `/api/operations/maintenance/{id}/complete` | PUT | Fleet Manager, Admin |
| `/api/finance/fuel-logs` | POST | Financial Analyst, Admin |
| `/api/finance/fuel-logs` | GET | All authenticated |
| `/api/finance/fuel-logs/{id}` | DELETE | Financial Analyst, Admin |
| `/api/finance/expenses` | POST | Financial Analyst, Admin |
| `/api/finance/expenses` | GET | All authenticated |
| `/api/finance/expenses/{id}` | DELETE | Financial Analyst, Admin |
| `/api/analytics/dashboard` | GET | All authenticated |
| `/api/documents/upload` | POST | All authenticated |
| `/api/documents/{filename}` | GET | All authenticated |
| `/api/documents/{filename}` | DELETE | All authenticated |
| `/api/chat` | POST | All authenticated |

### Frontend RBAC Implementation

- **`AuthContext`** (`lib/auth.tsx`): Stores `user` state, provides `login()`, `logout()`, `hasRole()`
- **`ProtectedRoute`** (`App.tsx`): Redirects unauthenticated users to `/login`
- **`RoleGuard`** (`App.tsx`): Checks `ROLE_ROUTES` map — if user's role isn't in the allowed list for the current path, redirects to `/unauthorized`
- **Sidebar**: Filters nav items by `item.roles.includes(user.role)`
- **Header**: Shows user display name, role badge, avatar initials

---

## 7. API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | JWT login (form-urlencoded) | No |
| POST | `/api/auth/register` | Register new user | No |
| GET | `/api/auth/me` | Get current user profile | Yes |
| GET | `/api/auth/roles` | List all roles | No |
| POST | `/api/auth/roles/seed` | Seed default roles | No |

### Fleet Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/fleet/vehicles` | Create vehicle | Fleet Manager |
| GET | `/api/fleet/vehicles` | List vehicles (?status, ?type, ?search, ?available_only) | All |
| PUT | `/api/fleet/vehicles/{id}` | Update vehicle | Fleet Manager |
| DELETE | `/api/fleet/vehicles/{id}` | Delete vehicle (not if On Trip) | Fleet Manager |
| POST | `/api/fleet/drivers` | Create driver profile | Fleet Manager, Safety Officer |
| GET | `/api/fleet/drivers` | List drivers (?status, ?available_only) | All |
| PUT | `/api/fleet/drivers/{id}` | Update driver | Fleet Manager, Safety Officer |
| DELETE | `/api/fleet/drivers/{id}` | Delete driver (not if On Trip) | Fleet Manager, Safety Officer |
| GET | `/api/fleet/drivers/unlinked` | List Driver-role users without profiles | All |
| POST | `/api/fleet/drivers/remind-expiring` | Send license expiry emails via SendGrid | Fleet Manager, Safety Officer |

### Operations (Trips & Maintenance)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/operations/trips/plan` | Plan routes via TollGuru (returns 2-3 options with polylines) | Dispatcher, Driver |
| POST | `/api/operations/trips/confirm` | Confirm route → create Draft trip | Dispatcher, Driver |
| GET | `/api/operations/trips` | List all trips with vehicle/driver names | All |
| PUT | `/api/operations/trips/{id}/dispatch` | Validate & dispatch (locks assets) | Dispatcher |
| PUT | `/api/operations/trips/{id}/complete` | Complete trip (updates odometer, frees assets) | Dispatcher, Driver |
| PUT | `/api/operations/trips/{id}/cancel` | Cancel trip (frees assets) | Dispatcher |
| DELETE | `/api/operations/trips/{id}` | Delete Draft/Cancelled trip | Dispatcher |
| POST | `/api/operations/maintenance` | Create maintenance record (sets vehicle In Shop) | Fleet Manager |
| GET | `/api/operations/maintenance` | List maintenance records (?status_filter) | All |
| DELETE | `/api/operations/maintenance/{id}` | Delete Active maintenance (restores vehicle) | Fleet Manager |
| PUT | `/api/operations/maintenance/{id}/complete` | Close maintenance (restores vehicle to Available) | Fleet Manager |

### Finance

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/finance/fuel-logs` | Create fuel log entry | Financial Analyst |
| GET | `/api/finance/fuel-logs` | List fuel logs | All |
| DELETE | `/api/finance/fuel-logs/{id}` | Delete fuel log | Financial Analyst |
| POST | `/api/finance/expenses` | Create expense entry | Financial Analyst |
| GET | `/api/finance/expenses` | List expenses | All |
| DELETE | `/api/finance/expenses/{id}` | Delete expense | Financial Analyst |

### Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/analytics/dashboard` | Aggregated KPIs, charts, vehicle costs | All |

Response includes: `fleet_utilization`, `on_time_delivery`, `safety_incidents`, `total_trips`, `avg_fuel_efficiency`, `operational_cost`, `vehicle_roi`, `monthly_revenue[]`, `top_costliest_vehicles[]`, `vehicle_status_counts{}`, `daily_utilization[]`

### Documents (MinIO)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/documents/upload` | Upload file to MinIO | All |
| GET | `/api/documents/{filename}` | Download/preview file | All |
| DELETE | `/api/documents/{filename}` | Delete file from MinIO | All |

### Chat

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/chat` | Send message to Gemini AI assistant | All |

---

## 8. Frontend Architecture

### Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.2.7 | UI framework |
| Vite | 8.1.4 | Build tool + dev server |
| TypeScript | 6.0.3 | Type safety |
| Tailwind CSS | 4.3.2 | Utility-first CSS |
| shadcn/ui | 4.13.0 | Base UI components (base-ui primitives) |
| React Router | 7.18.1 | Client-side routing |
| Recharts | 3.9.2 | Data visualization |
| i18next | 26.3.6 | Internationalization (EN/HI) |
| jsPDF | 4.2.1 | PDF export |
| jspdf-autotable | 5.0.8 | PDF tables |
| papaparse | 5.5.4 | CSV export |
| lucide-react | 1.24.0 | Icon library |

### Routing

```
/login              → LoginPage (public)
/dashboard          → DashboardPage (all roles)
/fleet/vehicles     → FleetPage (all authenticated)
/drivers            → DriversPage (all authenticated)
/trips              → TripsPage (Dispatcher, Driver)
/maintenance        → MaintenancePage (Fleet Manager, Dispatcher, Financial Analyst)
/fuel-expenses      → FuelExpensesPage (Fleet Manager, Dispatcher, Financial Analyst)
/analytics          → AnalyticsPage (all authenticated)
/settings           → SettingsPage (all authenticated)
/unauthorized       → UnauthorizedPage
```

### State Management

- **Auth state**: React Context (`AuthContext`) with `user`, `login()`, `logout()`, `hasRole()`
- **Theme state**: React Context (`ThemeContext`) with light/dark toggle, persisted in localStorage
- **Page-level state**: `useState` + `useEffect` for API data fetching
- **No global state library** — each page fetches its own data from the API

### Component Hierarchy

```
App.tsx
├── AuthProvider (context)
│   ├── ThemeProvider (context)
│   │   └── BrowserRouter
│   │       ├── Route /login → LoginPage
│   │       └── ProtectedRoute
│   │           └── RoleGuard
│   │               └── DashboardLayout
│   │                   ├── Sidebar (role-filtered nav)
│   │                   ├── Header (search, theme, lang, user)
│   │                   └── <Outlet /> (page content)
│   │                       ├── DashboardPage
│   │                       │   ├── FilterRibbon
│   │                       │   ├── KpiGrid
│   │                       │   ├── RecentTrips
│   │                       │   └── VehicleStatus
│   │                       ├── FleetPage → VehicleRegistryTable
│   │                       ├── DriversPage → DriverRegistryTable
│   │                       ├── TripsPage (plan + map + dispatch)
│   │                       ├── MaintenancePage → MaintenanceRegistryTable
│   │                       ├── FuelExpensesPage → FuelExpensesContent
│   │                       ├── AnalyticsPage (reports + export)
│   │                       └── SettingsPage
```

### PDF Export System

The analytics PDF uses **canvas-rendered charts** (no html2canvas dependency):

1. `drawBarChart()` — Revenue bar chart with gradient bars and rounded corners
2. `drawHorizontalBarChart()` — Vehicle cost breakdown with per-vehicle colors
3. `drawDonutChart()` — Vehicle status distribution with legend
4. `drawLineChart()` — Daily utilization trend with area fill and dot markers

Each chart function draws on an offscreen `<canvas>`, converts to a PNG data URL, and embeds in the PDF via `doc.addImage()`.

---

## 9. External Integrations

### TollGuru (Route Planning)

- **Purpose**: Provides 2–3 route options with distance, duration, toll cost, fuel estimate, and Google Maps polyline
- **Endpoint**: `POST /api/operations/trips/plan`
- **Vehicle type mapping**: `Truck` → `2axleTruck`, `Mini` → `2axletruck`, `Van` → `car`/`suv`
- **Auth**: API key via `TOLLGURU_API_KEY` env var
- **Fallback**: If no API key, generates mock route options

### SendGrid (Email Notifications)

- **Purpose**: Sends license expiry warning emails to fleet managers
- **Endpoint**: `POST /api/fleet/drivers/remind-expiring`
- **Trigger**: Checks drivers with licenses expiring in ≤30 days
- **Auth**: API key via `SENDGRID_API_KEY` env var
- **Template**: HTML email with driver table (name, license, expiry date)

### Google Gemini AI (Chat Assistant)

- **Purpose**: AI-powered chat for fleet operations queries
- **Endpoint**: `POST /api/chat`
- **Auth**: API key via `GEMINI_API_KEY` env var

### MinIO (Object Storage)

- **Purpose**: Stores uploaded documents (fuel bills, maintenance bills, vehicle docs, license scans)
- **Protocol**: S3-compatible API
- **Bucket**: `transitops-documents` (auto-created on startup)
- **Internal client**: `minio:9000` (Docker DNS)
- **External client**: `localhost:9002` (for presigned URLs)
- **Graceful degradation**: Backend starts even if MinIO is unavailable (bucket creation skipped)

---

## 10. Business Logic & Workflows

### Trip Lifecycle (State Machine)

```
                    ┌──────────┐
                    │  DRAFT   │
                    └────┬─────┘
                         │
            dispatch_trip│  (validates capacity, compliance, availability)
                         │
                         ▼
                    ┌──────────┐
           ┌───────│DISPATCHED│───────┐
           │       └──────────┘       │
           │                          │
  cancel_trip│                complete_trip│  (updates odometer)
           │                          │
           ▼                          ▼
     ┌──────────┐             ┌──────────┐
     │CANCELLED │             │COMPLETED │
     └──────────┘             └──────────┘
```

**Dispatch Validation Rules:**
1. Cargo weight ≤ vehicle capacity
2. Vehicle status must be "Available"
3. Driver status must be "Available"
4. Driver license must not be expired

**Asset Locking:**
- On dispatch: Vehicle → "On Trip", Driver → "On Trip"
- On complete/cancel: Both → "Available"

### Maintenance Lifecycle

```
CREATE maintenance → Vehicle: "In Shop"
     │
     ├── COMPLETE maintenance → Vehicle: "Available"
     │
     └── DELETE maintenance → Vehicle: "Available" (if was In Shop)
```

### ROI Calculation

```
ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost × 100
```

### Fuel Efficiency

```
Avg Fuel Efficiency = SUM(odometer) / SUM(liters)
```

### Operational Cost

```
Operational Cost = SUM(fuel_logs.fuel_cost) + SUM(maintenance_logs.cost) + SUM(trips.toll_cost)
```

---

## 11. Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `SECRET_KEY` | — | JWT signing key (HS256) |
| `MINIO_ENDPOINT` | `localhost:9000` | MinIO internal endpoint |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_SECURE` | `false` | Use HTTPS for MinIO |
| `MINIO_BUCKET` | `transitops-documents` | MinIO bucket name |
| `MINIO_EXTERNAL_URL` | `http://localhost:9002` | External URL for presigned links |
| `TOLLGURU_API_KEY` | — | TollGuru API key |
| `SENDGRID_API_KEY` | — | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | — | Sender email address |
| `NOTIFICATION_EMAIL` | — | Recipient for alerts |
| `GEMINI_API_KEY` | — | Google Gemini AI key |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS allowed origins (comma-separated) |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API base URL |

### PostgreSQL (Docker)

| Variable | Value |
|----------|-------|
| `POSTGRES_USER` | `transitops_admin` |
| `POSTGRES_PASSWORD` | `internal_secure_pass` |
| `POSTGRES_DB` | `transitops_prod` |
