# CodeCore IMS - Project Details

## Overview
CodeCore IMS (Institute Management System) is a comprehensive platform designed for Code Core Computer Center, Gurugram to manage students, enrollments, fees, attendance, and results.

## Technology Stack
- **Frontend**: React.js + Vite, Tailwind CSS, Shadcn UI, Lucide Icons, Axios
- **Backend**: Django, Django REST Framework (DRF), PostgreSQL
- **PDF Generation**: jsPDF + jspdf-autotable
- **Integrations**: Google Sheets API (student data sync), Gmail SMTP (email receipts), JWT Authentication

---

## Core Features & Work Completed

### 1. Student Management
- **Centralized Database**: Storage for detailed student information (personal details, parent info, photo, documents, Aadhaar, etc.)
- **Google Sheets Sync**: Two-source sync system:
  - **Form Sheet** — Google Form responses → Students + Enrollments auto-created
  - **Admission Details Sheet** — Staff sheet → Roll No., Session, Joining Date, Total Fees, Status update
  - Both combined into single **"Sync" button** — runs Form Sheet first, then Admission Details automatically
- **Smart Duplicate Prevention**: 4-level student matching during sync:
  1. Email exact match
  2. Phone last 8 digits match
  3. First name + DOB + Father's Name (all three required)
  4. Roll No. from existing enrollment
  - New student only created if all 4 levels fail
- **Active/Inactive Status**: Tracking student status (Active, Completed, Dropped)
- **Add Student Manually**: Modal with full form — personal info, course, admission date, fees

### 2. Course Management
- **Course Model**: name, short_name, duration_months, total_fee, offer_fee, fee_type (monthly/quarterly/full), description, is_active
- **Seed Command**: `python manage.py seed_courses` — seeds all CodeCore courses at once
- **Course Alias System**: `COURSE_ALIAS_MAP` + DB `CourseAlias` table — maps sheet variations to correct DB course names (e.g. "DCA" → "Diploma in Computer Applications")
- **Important**: Courses must be seeded before any Google Sheet sync — otherwise enrollments won't be created

### 3. Multi-Course Enrollment
- **Enrollment Model**: Supports students enrolling in multiple courses simultaneously
- **Status Tracking**: Each enrollment has its own status, start date, roll_no, session, fee configuration
- **Auto-Creation**: Enrollments automatically created during Form Sheet sync (if course exists in DB)

### 4. Fee Management
- **Fee Structures**: Define total fees and discounts per student enrollment
- **Payment Tracking**: Individual payment installments — Cash and Online modes
- **Automated Receipts**: Unique receipt number auto-generated per payment
- **Dashboard Summary Cards**: Total Final Fee, Total Collected, Total Balance, Total Students
- **Interactive UI**: Expandable rows for payment history, modals for adding fee structures and payments

#### Fee Receipt PDF (`frontend/src/lib/generateReceipt.js`)
- Premium PDF using jsPDF + jspdf-autotable
- Blue header — logo, tagline, contact, ISO certification, E-Max branding
- Student info card — Name, Enrollment No., Father's Name, Mobile, Course, Joining Date + Photo
- 4 colored tiles — Total Fee, Discount, Amount Paid, Balance Due
- Full payment history table
- Payment Terms + Declaration section
- Circular stamp image, ad banner, footer, diagonal watermark
- Currency: `Rs.` (not ₹ — jsPDF Helvetica doesn't support ₹)
- Student photo loaded from Google Drive via `thumbnail` URL (CORS-safe)

#### Email Receipt (`backend/fees/views.py → send_receipt()`)
- Django Gmail SMTP — sends PDF as attachment
- Premium HTML email template — blue header, green success bar, receipt details table, professional signature
- Signature includes photo, social links (WhatsApp, Google Maps, Instagram), ISO footer
- `.env` requires `EMAIL_HOST_USER` + `EMAIL_HOST_PASSWORD` (Gmail App Password)

#### WhatsApp Notification (`Fees.jsx`)
- `wa.me` link — opens WhatsApp with pre-filled payment confirmation message
- WhatsApp bold/italic formatting (`*bold*`, `_italic_`)
- Phone number auto-sanitized — handles +91, spaces, dashes

#### Action Buttons Layout
- Receipt No. cell mein inline — Download (blue), Email (red), WhatsApp (green)
- Action column mein sirf Delete button

### 5. Dashboard & UI/UX
- **Modern Design**: Premium aesthetic using Shadcn UI + custom Tailwind styling
- **Analytics**: Key metrics on Dashboard and Fees pages
- **Responsive Layout**: Sidebar navigation, mobile-friendly tables, pagination (15 per page)
- **Sync Result**: Toast notification after sync — shows created/updated/skipped counts

### 6. Backend Architecture
- **JWT Auth**: Secure API access, `access_token` in localStorage
- **RESTful APIs**: Well-defined endpoints for students, courses, enrollments, fees, sync
- **Signals/Overridden Saves**: Auto-calculation of final fees, receipt number generation
- **Sheet Sync**: `backend/students/sheet_sync.py` — handles both Form Sheet and Admission Details sync

---

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/token/` | Login — JWT token |
| GET | `/api/students/` | All students |
| GET | `/api/students/courses/` | All courses |
| GET | `/api/students/{id}/enrollments/` | Student enrollments |
| POST | `/api/students/sync-all/` | Combined sync (Form + Details) |
| GET | `/api/fees/` | All fee structures with payments |
| GET | `/api/fees/summary/` | Total fee, collected, balance |
| POST | `/api/fees/create/` | New fee structure |
| POST | `/api/fees/payments/create/` | Add payment |
| DELETE | `/api/fees/payments/{id}/delete/` | Delete payment |
| POST | `/api/fees/payments/send-receipt/` | Email PDF receipt |

---

## Important Setup Notes
- `python manage.py seed_courses` — **must run before first sync**
- Sync order: seed_courses → Sync button (runs Form Sheet then Admission Details)
- `.env` must have Gmail App Password for email receipts
- `codecore-sheets-key.json` must be in `backend/` folder
- Google Drive student photos use `thumbnail?id=&sz=w400` URL (not `uc?export=view` — CORS blocked)

---

## Recent Updates (May 2026)
- **Fee Model Overhaul**: Structured `FeeStructure → FeePayment` architecture
- **Premium PDF Receipt**: jsPDF with photo, stamp, watermark, colored tiles
- **Email Receipt**: HTML template with PDF attachment via Gmail SMTP
- **WhatsApp Notification**: Pre-filled formatted message via `wa.me`
- **Receipt Buttons**: Moved inline with Receipt No. — Download, Email, WhatsApp + separate Delete
- **Google Sheet Sync Rewrite**:
  - 4-level duplicate prevention
  - Single "Sync" button replacing two separate buttons
  - Combined `/api/students/sync-all/` backend endpoint
- **Course System**: `seed_courses` command, `COURSE_ALIAS_MAP`, DB `CourseAlias` table
- **DB Reset & Re-seed**: Full TRUNCATE + RESTART IDENTITY done, clean data re-imported