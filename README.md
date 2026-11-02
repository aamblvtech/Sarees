# VESTRA — Luxury AI Virtual Try-On Platform
> *“Experience Fashion Before You Wear It.”*

The first working version of **VESTRA**, a premium luxury fashion technology platform with simulated AI virtual try-on draping, architectural tailoring, fluid silks, and computer vision fitting room workflows.

---

## 1. System Architecture

```
                               +-----------------------------------+
                               |       Client Browser / Kiosk      |
                               |    React + Vite + Tailwind CSS    |
                               +-----------------------------------+
                                                 |
                       +-------------------------+-------------------------+
                       |                                                   |
             [REST API & Axios]                                 [HTML5 Camera Stream]
             JSON / Multipart Data                              Webcam Snapshot & Canvas
                       |                                                   |
                       v                                                   v
      +-------------------------------------------------------------------------------+
      |                       VESTRA Express REST API (Node.js)                       |
      |                 Port: 5000 | Parameterized SQL | Multer Upload                |
      +-------------------------------------------------------------------------------+
              |                                           |
              v                                           v
  +-----------------------+                   +---------------------------------------+
  |  PostgreSQL Database  |                   |         Try-On Adapter Engine         |
  |      (pg package)     |                   |  Modular Adapter Pattern Interface    |
  |  Migrations & Seeds   |                   +---------------------------------------+
  +-----------------------+                                       |
                                                                  v
                                                        [MockTryOnAdapter]
                                                    High-Fidelity Simulation
                                                    (v1.0 Initial Development)
```

---

## 2. Key Pages & Features

### 1. Home Page (`/`)
- **Luxury Navigation Bar**: Brand identity (`VESTRA`), luxury tracking, direct navigation links, and rapid CTA to the fitting room.
- **Hero Section**: High-fashion photography, bold headline (*"Try Before You Buy"*), and tagline (*"Experience Fashion Before You Wear It"*).
- **Curated Silhouette Capsules**: Category cards (Eveningwear, Structured Tailoring, Modern Outerwear, Silk Essentials, Resort Atelier).
- **Featured Garment Showcase**: Curated product cards with direct "Try It On" quick-action buttons.
- **How Virtual Try-On Works**: 4-step editorial breakdown of the computer vision draping process.
- **Luxury Editorial Footer**: Client services, atelier locations, and ethical AI/privacy transparency notices.

### 2. Atelier Catalogue (`/catalogue`)
- **Product Grid**: Clean, responsive layout showcasing luxury garments with hover zoom effects.
- **Category Filters**: Filter on the fly between Eveningwear, Tailoring, Outerwear, Silk Essentials, and Resort.
- **Search & Sort**: Full text search and sorting by Price (Low/High) or Featured status.
- **Product Cards**: High-resolution imagery, category tag, title, formatted price, and direct "Try It On" buttons.

### 3. Product Details (`/products/:id`)
- **Interactive Photography Gallery**: High-resolution photography with thumbnail selector.
- **Garment Specifications**: SKU, description, composition, origin, and care instructions.
- **Size Selector**: Luxury size pills (`XS`, `S`, `M`, `L`, `XL`).
- **Direct Try-On Action**: Launches the Virtual Fitting Room with the chosen garment and size pre-selected.

### 4. Virtual Fitting Room (`/try-on`)
- **Dual-Column Studio**:
  - **Left (Silhouette Acquisition)**:
    - Drag-and-drop customer photo upload interface.
    - Camera access button with real-time video stream, framing guide overlay, and snapshot capture.
    - Pre-calibrated sample luxury model silhouettes for instant testing without personal photo uploads.
  - **Right (Garment & Drape Tuning)**:
    - Selected garment display with "Change Garment" picker modal.
    - Size selector & silhouette drape preference (*Tailored*, *Fluid*, *Relaxed*).
    - **Generate Try-On Button**: Initiates the fitting engine with progress milestones.
- **Result Preview Area**:
  - Split inspection and side-by-side comparison modes.
  - Fit metrics: Shoulder seam alignment, fabric drape physics, fit score calculation.
  - Transparent prototype disclaimer: *"Prototype Mock Result — Initial Development Milestone. Generative AI cloth-warping is simulated for UI/UX testing."*

---

## 3. Technology Stack

### Frontend
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS (custom luxury color palette: warm ivory `#FAF7F2`, charcoal `#121212`, muted beige `#E8E2D9`, bronze `#8C7355`)
- **Routing**: React Router v7
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Language**: JavaScript (ES Modules)

### Backend
- **Runtime**: Node.js
- **Server**: Express.js
- **Database Driver**: `pg` (node-postgres with connection pooling)
- **Database**: PostgreSQL (parameterized queries `$1, $2, ...` across all endpoints)
- **File Uploads**: Multer (10MB limit, image validation)
- **Architecture**: Modular provider adapter pattern for pluggable AI engines

---

## 4. Database Schema & Migrations

The database migrations (`backend/src/db/migrations/001_vestra_schema.sql`) define 6 core tables:

1. `categories` (id, name, slug, description, image_url, created_at)
2. `products` (id, sku, name, slug, category_id, price, original_price, currency, description, material, fit, care_instructions, sizes, is_sample, is_featured, is_active, created_at, updated_at)
3. `product_images` (id, product_id, image_url, alt_text, is_primary, sort_order)
4. `tryon_sessions` (id, session_token, user_photo_url, silhouette_label, fit_preference, created_at, expires_at)
5. `tryon_jobs` (id, job_uuid, session_id, product_id, user_photo_url, garment_image_url, selected_size, status, provider, error_message, created_at, completed_at)
6. `tryon_results` (id, job_id, result_image_url, composite_details, fit_score, is_simulation, disclaimer_acknowledged, created_at)

---

## 5. Quick Start Guide

### Prerequisites
- Node.js >= 18
- PostgreSQL (optional for local dev; if PostgreSQL is offline, backend automatically provides seamless sample inventory fallback)

### 1. Backend Setup
```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env

# Run database migration (requires running PostgreSQL)
npm run migrate

# Seed sample luxury products into PostgreSQL
npm run seed

# Start Express server (runs on http://localhost:5000)
npm start
# or development watch mode:
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Copy environment variables
cp .env.example .env

# Start Vite dev server (runs on http://localhost:5173)
npm run dev

# Or build for production
npm run build
```

---

## 6. REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check, uptime, and database connection state |
| `GET` | `/api/categories` | Retrieve all garment categories |
| `GET` | `/api/products` | Retrieve all products (supports `?category=...&search=...&featured=true`) |
| `GET` | `/api/products/:id` | Retrieve single product details by ID or slug |
| `GET` | `/api/tryon/sample-silhouettes` | Get pre-calibrated sample model silhouettes |
| `POST` | `/api/tryon/upload` | Upload user silhouette photo (JPG/PNG/WebP, max 10MB) |
| `POST` | `/api/tryon/jobs` | Submit a virtual try-on fitting job |
| `GET` | `/api/tryon/jobs/:id` | Poll try-on job status and composite result |

---

## 7. Try-On AI Adapter Extensibility

The try-on engine is decoupled from route handlers through the adapter pattern (`backend/src/adapters/tryon/`):
- `BaseTryOnAdapter`: Abstract base contract with `processTryOn({ userPhotoUrl, garmentImageUrl, selectedSize, options })`.
- `MockTryOnAdapter`: High-fidelity simulation adapter providing realistic latency, drape analysis metadata, and honest prototype simulation tags.
- Future cloud or GPU adapters (e.g. IDM-VTON, Fal.ai, Replicate) can be added by implementing `BaseTryOnAdapter` and selecting them via `TRYON_PROVIDER=idm_vton` in `.env`.
