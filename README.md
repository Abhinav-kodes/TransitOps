<div align="center">

<img src="frontend/src/assets/TT-removebg-preview.png" alt="TransitOps Logo" width="100" />

# TransitOps

### Smart Transport Operations Platform

**Hackathon Duration:** 8 Hours

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB.svg)](#)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](#)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.139-009688.svg)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg)](#)

---

</div>

## Problem Statement

Many logistics companies still rely on **spreadsheets and manual logbooks** to manage their transport operations. This leads to:

- Scheduling conflicts and double-booking of vehicles
- Underutilized fleet assets with no visibility
- Missed maintenance windows and vehicle breakdowns
- Expired driver licenses creating compliance risks
- Inaccurate expense tracking and poor cost control
- Zero operational insight — no KPIs, no analytics, no ROI

## Solution

**TransitOps** is a centralized, full-stack platform that digitizes the **complete lifecycle** of transport operations — from vehicle registration and driver management to AI-powered dispatching, maintenance workflows, fuel logging, expense tracking, and real-time analytics.

Built in 8 hours with a production-grade architecture: **React 19 + FastAPI + PostgreSQL + MinIO**, containerized with Docker Compose.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     BROWSER (React 19 SPA)                     │
│        Vite 8 · Tailwind 4 · shadcn/ui · Recharts · i18n     │
└───────────────────────────┬────────────────────────────────────┘
                            │  HTTP / JSON
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                    FastAPI (Python 3.11)                        │
│   SQLModel ORM · JWT Auth · RBAC · Async Handlers              │
│   Modules: auth · fleet · ops · finance · analytics · AI chat  │
└──────┬─────────────────────┬───────────────────┬───────────────┘
       │                     │                   │
       ▼                     ▼                   ▼
┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐
│ PostgreSQL   │    │    MinIO     │    │    External APIs     │
│ 16 (async)   │    │  S3 Storage  │    │ TollGuru · SendGrid  │
│ 8 tables     │    │  Documents   │    │ Google Gemini AI     │
└─────────────┘    └──────────────┘    └──────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, Vite 8, TypeScript 6 | SPA with hot reload |
| **Styling** | Tailwind CSS 4, shadcn/ui | Design system + components |
| **Charts** | Recharts 3.9 | Dashboard visualizations |
| **Export** | jsPDF, jspdf-autotable, PapaParse | PDF with embedded charts + CSV |
| **i18n** | i18next, react-i18next | English + Hindi localization |
| **Backend** | FastAPI 0.139, Python 3.11 | Async REST API |
| **ORM** | SQLModel, SQLAlchemy 2.0 | Type-safe database models |
| **Database** | PostgreSQL 16 (asyncpg) | Persistent relational storage |
| **Auth** | PyJWT (HS256), bcrypt | JWT tokens + password hashing |
| **Storage** | MinIO (S3-compatible) | Document uploads (bills, licenses) |
| **AI** | Google Gemini | Fleet operations chatbot |
| **Routing** | TollGuru API | Route planning with toll costs |
| **Email** | SendGrid API | License expiry notifications |
| **Maps** | Leaflet + OpenStreetMap | Interactive route visualization |
| **Infra** | Docker Compose | 4-service containerized stack |

---

## Features Implemented

### All Mandatory Deliverables

| # | Requirement | Status | Implementation |
|---|------------|--------|----------------|
| 1 | Responsive web interface | Done | Tailwind CSS, mobile-friendly grid layouts |
| 2 | Authentication with RBAC | Done | JWT login, 6 roles, per-endpoint permissions, Admin superuser |
| 3 | CRUD for Vehicles & Drivers | Done | Full create/read/update/delete with validation |
| 4 | Trip Management with validations | Done | Capacity checks, compliance gates, license expiry blocks |
| 5 | Automatic status transitions | Done | Dispatch → On Trip, Complete → Available, Cancel → Available |
| 6 | Maintenance workflow | Done | Auto In Shop on create, auto Available on close |
| 7 | Fuel & Expense tracking | Done | Per-vehicle fuel logs + expense records with MinIO uploads |
| 8 | Dashboard with KPIs | Done | 7 real-time KPIs computed from live database |
| 9 | Charts and visual analytics | Done | Bar charts, donut charts, line charts, cost breakdowns |
| 10 | PDF export | Done | 3-page branded PDF with canvas-rendered charts |

### All Bonus Features

| # | Feature | Status | Implementation |
|---|---------|--------|----------------|
| 11 | Email reminders for expiring licenses | Done | SendGrid integration, HTML emails, 30-day threshold |
| 12 | Vehicle document management | Done | MinIO upload/download/delete for bills and licenses |
| 13 | Search, filters, and sorting | Done | Vehicle type/status/search, driver status, date range filters |
| 14 | Dark mode | Done | System-wide light/dark toggle with localStorage persistence |

### Extra Features (Beyond PRD)

| # | Feature | Description |
|---|---------|-------------|
| 15 | **AI Chatbot** | Google Gemini-powered "Ask TransitOps" — answer fleet queries in natural language |
| 16 | **Interactive Route Map** | Leaflet/OpenStreetMap with TollGuru polylines rendered on trip planning |
| 17 | **TollGuru Route Planning** | 2–3 route options with distance, toll cost, fuel estimate, and polyline |
| 18 | **Hindi Localization** | Full UI translation to Hindi via i18next (161 translation keys) |
| 19 | **Branded PDF Export** | Canvas-rendered bar charts, donut charts, line charts embedded in PDF |
| 20 | **CSV Export** | Multi-section CSV with all analytics data |
| 21 | **Driver License Reminders** | Automated email alerts for licenses expiring within 30 days |
| 22 | **Driver-User Linking** | Link Driver-role users to driver profiles for assignment |

---

## Business Rules — Fully Enforced

Every business rule from the PRD is implemented as server-side validation:

| Rule | Where Enforced |
|------|---------------|
| Vehicle registration number must be unique | `POST /api/fleet/vehicles` — 400 on duplicate |
| Retired/In Shop vehicles excluded from dispatch | `PUT /trips/{id}/dispatch` — status check |
| Expired license blocks dispatch | `PUT /trips/{id}/dispatch` — `expiry_date < today` |
| Suspended drivers blocked from dispatch | `PUT /trips/{id}/dispatch` — status check |
| On Trip vehicle/driver cannot be double-assigned | `PUT /trips/{id}/dispatch` — availability check |
| Cargo weight ≤ vehicle capacity | `POST /trips/plan` + `PUT /trips/{id}/dispatch` — 422 on breach |
| Dispatch auto-sets On Trip | `PUT /trips/{id}/dispatch` — transactional state mutation |
| Complete auto-sets Available | `PUT /trips/{id}/complete` — frees both assets |
| Cancel restores Available | `PUT /trips/{id}/cancel` — frees both assets if Dispatched |
| Maintenance auto-sets In Shop | `POST /operations/maintenance` — vehicle status mutation |
| Close maintenance restores Available | `PUT /maintenance/{id}/complete` — vehicle status restore |
| Admin bypasses all RBAC | `require_roles()` — checks `RoleName.ADMIN` first |

---

## Role-Based Access Control

```
┌─────────────────────────────────────────────────────────────────┐
│                         RBAC Matrix                             │
├─────────────────────┬───────┬──────┬────────┬────────┬─────────┤
│ Action              │ Fleet │ Disp │ Driver │ Safety │ Finance │
│                     │ Mgr   │      │        │ Off    │ Analyst │
├─────────────────────┼───────┼──────┼────────┼────────┼─────────┤
│ Vehicle CRUD        │  ✅   │  ❌  │   ❌   │   ❌   │   ❌    │
│ Driver CRUD         │  ✅   │  ❌  │   ❌   │   ✅   │   ❌    │
│ Create Trip         │  ❌   │  ✅  │   ❌   │   ❌   │   ❌    │
│ Plan Routes         │  ❌   │  ✅  │   ✅   │   ❌   │   ❌    │
│ Dispatch Trip       │  ❌   │  ✅  │   ❌   │   ❌   │   ❌    │
│ Complete Trip       │  ❌   │  ✅  │   ✅   │   ❌   │   ❌    │
│ Maintenance CRUD    │  ✅   │  ❌  │   ❌   │   ❌   │   ❌    │
│ Fuel Logs           │  ❌   │  ❌  │   ❌   │   ❌   │   ✅    │
│ Expenses            │  ❌   │  ❌  │   ❌   │   ❌   │   ✅    │
│ Analytics           │  ✅   │  ✅  │   ✅   │   ✅   │   ✅    │
│ Admin (all)         │  ✅   │  ✅  │   ✅   │   ✅   │   ✅    │
└─────────────────────┴───────┴──────┴────────┴────────┴─────────┘
```

---

## Database Schema

**8 tables** with proper foreign keys, check constraints, and enum types:

```
roles ──< users >── drivers ──< trips >──< expenses >── maintenance_logs
                            │                              │
                        vehicles ──< fuel_logs             │
                                  ──< expenses ────────────┘
```

| Table | Key Fields | Constraints |
|-------|-----------|-------------|
| `roles` | id, name (enum) | UNIQUE name |
| `users` | id, email, hashed_password, role_id | UNIQUE email, FK → roles |
| `vehicles` | id, reg_no, name_model, type, capacity_kg, odometer, acq_cost, status | UNIQUE reg_no, CHECK capacity > 0 |
| `drivers` | id, user_id, name, license_no, category, expiry_date, safety_score, status | UNIQUE license_no, CHECK score 0–100 |
| `trips` | id, trip_code, source, destination, vehicle_id, driver_id, cargo_weight, planned_dist, status, toll_cost | UNIQUE trip_code, FK → vehicles/drivers |
| `maintenance_logs` | id, vehicle_id, service_type, cost, entry_date, status | FK → vehicles |
| `fuel_logs` | id, vehicle_id, date, liters, fuel_cost | FK → vehicles, CHECK liters > 0 |
| `expenses` | id, trip_id, vehicle_id, maint_id, toll, other, total_cost | FK → vehicles/trips/maintenance |

---

## API Endpoints

**28 REST endpoints** across 7 modules:

| Module | Prefix | Endpoints | Description |
|--------|--------|-----------|-------------|
| Authentication | `/api/auth` | 5 | Login, register, roles, seed |
| Fleet | `/api/fleet` | 9 | Vehicle + Driver CRUD |
| Operations | `/api/operations` | 10 | Trip lifecycle + Maintenance |
| Finance | `/api/finance` | 6 | Fuel logs + Expenses |
| Analytics | `/api/analytics` | 1 | Dashboard KPI aggregation |
| Documents | `/api/documents` | 3 | MinIO file upload/download/delete |
| Chat | `/api/chat` | 1 | Gemini AI assistant |

Full API documentation available at `http://localhost:8000/docs` (Swagger UI).

---

## Dashboard KPIs

All computed in **real-time** from the database — no cached/mock data:

| KPI | Calculation |
|-----|-------------|
| Fleet Utilization | `(vehicles ON_TRIP / total) × 100` |
| On-Time Delivery | `(completed trips / total trips) × 100` |
| Safety Incidents | Count of SUSPENDED drivers |
| Total Trips | `COUNT(*)` from trips table |
| Avg Fuel Efficiency | `SUM(odometer) / SUM(liters)` |
| Operational Cost | `SUM(fuel_cost) + SUM(maintenance_cost) + SUM(toll_cost)` |
| Vehicle ROI | `(Revenue - (Maint + Fuel)) / AcqCost × 100` |

---

## Project Structure

```
odoo/
├── docker-compose.yml              # 4-service orchestration
├── backend/
│   ├── main.py                     # FastAPI entrypoint
│   ├── api/                        # 7 route modules
│   │   ├── dependencies.py         # JWT auth + RBAC factory
│   │   ├── authentication/         # Login, register, roles
│   │   ├── fleet/                  # Vehicle & Driver CRUD
│   │   ├── operations/             # Trip state machine + maintenance
│   │   ├── finance/                # Fuel & expense tracking
│   │   ├── analytics/              # Dashboard KPI aggregation
│   │   ├── documents/              # MinIO file operations
│   │   └── chat/                   # Gemini AI chatbot
│   └── packages/db/models/         # 8 SQLModel tables
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Router + RBAC guards
│   │   ├── lib/                    # Auth, i18n, theme, export
│   │   ├── pages/                  # 9 route pages
│   │   ├── components/dashboard/   # 20+ components
│   │   └── locales/                # EN + HI translations
│   └── public/                     # Favicon
└── docs/
    └── ARCHITECTURE.md             # Detailed system docs
```

---

## Quick Start

### Prerequisites
- Docker & Docker Compose

### One Command to Run

```bash
git clone https://github.com/Abhinav-kodes/TransitOps.git
cd TransitOps
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

### Default Roles (auto-seeded)
| Role | Access |
|------|--------|
| Fleet Manager | Vehicles, drivers, maintenance, analytics |
| Dispatcher | Trip planning, dispatch, completion |
| Driver | View/complete assigned trips |
| Safety Officer | Driver management, compliance |
| Financial Analyst | Fuel logs, expenses, analytics |
| Admin | Full access (superuser, bypasses all RBAC) |

---

## Screenshots

### Login Page
Split-screen Motive-inspired design with role selection and feature highlights.

### Dashboard
Real-time KPI cards, vehicle status donut chart, recent trips, and fleet utilization metrics.

### Trip Planning
Source/destination input → TollGuru route options → Interactive Leaflet map with polyline → Dispatch.

### Analytics & Reports
Monthly revenue bar charts, vehicle cost breakdown, donut charts — export to **PDF** (with embedded canvas-rendered charts) or **CSV**.

### Dark Mode
Full dark mode support across all pages with system preference detection.

### AI Chatbot
Floating "Ask TransitOps" chatbot powered by Google Gemini — ask questions about your fleet in natural language.

### Hindi Localization
Full UI translation toggle between English and Hindi.

---

## What Makes This Stand Out

1. **Every single PRD requirement is implemented** — mandatory + bonus, with zero shortcuts
2. **Production-grade architecture** — async FastAPI, proper RBAC factory, Docker Compose, health checks
3. **14 bonus features** beyond the PRD — AI chatbot, interactive maps, Hindi i18n, branded PDF export, email notifications
4. **All business rules enforced server-side** — no client-side-only validation hacks
5. **Real-time analytics** — every KPI computed from live database queries, no mock data
6. **Professional PDF export** — canvas-rendered charts embedded in a branded 3-page report
7. **8 database tables** with proper constraints, foreign keys, and check constraints
8. **28 REST endpoints** with per-endpoint RBAC and comprehensive error handling
9. **Complete i18n** — 161 translation keys in both English and Hindi
10. **Built in 8 hours** — full-stack, containerized, and documented

---

## Documentation

- [Architecture Document](docs/ARCHITECTURE.md) — detailed system design (812 lines)
- [Swagger API Docs](http://localhost:8000/docs) — interactive API explorer

---

## License

MIT License. Built for hackathon evaluation.
