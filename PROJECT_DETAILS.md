# CodeCore IMS - Project Details

Last updated: 28 May 2026

## Project Overview

CodeCore IMS (Institute Management System) is a full-stack web app for Code Core Computer Center, Gurugram. It manages institute operations such as students, courses, enrollments, fee collection, receipts, attendance, and reporting.

The app currently has a Django REST backend and a React/Vite frontend. Most daily workflows are already usable from the UI: login, dashboard, student list/detail, Google Sheets sync, course list/update, fee tracking, PDF/email/WhatsApp receipts, and attendance marking/reporting.

## Technology Stack

- Frontend: React, Vite, Tailwind CSS, shadcn/ui style components, Radix UI, Lucide icons, Axios, React Router
- Backend: Django, Django REST Framework, PostgreSQL
- Authentication: JWT-style token flow used by frontend auth hook and protected routes
- PDF generation: jsPDF and jspdf-autotable
- Charts/report UI: custom CSS charting and Recharts dependency available
- Integrations: Google Sheets API, Google Drive image thumbnails/proxy, Gmail SMTP, WhatsApp `wa.me`
- Static deployment support: Django serves built frontend via `TemplateView` fallback and `staticfiles`

## Repository Structure

```text
codecore-ims/
  backend/
    attendance/        Attendance model, APIs, reports, calendar data
    config/            Django settings, root urls, ASGI/WSGI
    fees/              Fee structures, payments, receipt email APIs
    results/           Placeholder app, not implemented yet
    students/          Students, courses, enrollments, Google Sheets sync
    users/             Auth/user app
    manage.py
    requirements.txt
  frontend/
    public/            logo.png, stamp.png, favicon, icons
    src/
      api/             Axios instance
      components/      ProtectedRoute and UI components
      hooks/           useAuth, useToast
      lib/             utilities and receipt PDF generator
      pages/           Dashboard, Students, StudentDetail, Courses, Fees, Attendance, Login
  README.md
  PROJECT_DETAILS.md
  start-backend.ps1
  start-dev.bat
```

## Completed Work

### 1. Authentication and App Shell

- Login page is available at `/login`.
- Backend auth routes are mounted under `/api/auth/`.
- Login uses SimpleJWT access/refresh tokens.
- Axios attaches the bearer token automatically and refreshes access tokens on 401.
- Protected routes are wrapped by `ProtectedRoute`.
- Auth state is handled through `AuthProvider`.
- Dashboard layout is shared across protected pages.
- Catch-all frontend route redirects users to `/dashboard`.
- Toast system is available through `ToastProvider` and `useToast`.

### 2. Dashboard

- Dashboard home route exists at `/dashboard`.
- Backend dashboard stats endpoint returns:
  - active student count
  - total course count
- Dashboard shell provides navigation to Students, Courses, Fees, Attendance, and Results.
- Results is currently shown as a "Coming soon" page.

### 3. Student Management

- Student model stores:
  - name, father name, mother name
  - date of birth, gender, qualification, address
  - phone, email, Aadhaar number
  - Google Drive links for photo and Aadhaar front/back
  - course, admission date, total fees, comments
  - status: active, completed, dropped, inactive
  - Google Sheet row and sync timestamp
- Student list page includes:
  - active/completed/dropped/all tabs
  - search by name, father name, or phone
  - sortable table columns
  - pagination with 15 rows per page
  - status badges
  - refresh button
  - row click to open student detail page
- Manual student creation modal is implemented:
  - personal information fields
  - course selection
  - admission date
  - total fees
  - status
  - comments/notes
- Student detail endpoint supports `GET` and `PATCH`.
- Student list endpoint supports optional status filtering.
- Google Drive image proxy endpoint exists for student photos.

### 4. Google Sheets Sync

- Google Sheet sync logic lives in `backend/students/sheet_sync.py`.
- Two source sheets are supported:
  - Google Form responses sheet
  - Staff Admission Details sheet
- Combined sync endpoint exists:
  - Form sheet runs first
  - Admission Details sheet runs after that
  - UI exposes a single `Sync` button
- Individual sync endpoints still exist for form/details flows.
- Sync result includes created, updated, skipped, and errors.
- Details sync updates/enriches:
  - roll number
  - session
  - date of joining/start date
  - total fees/fee amount
  - status
- Details sync can also create students that exist only in the details sheet.
- Duplicate prevention/matching logic is documented in the current implementation as:
  - email exact match
  - phone last 8 digits match
  - first name + DOB + father's name
  - roll number from existing enrollment
- Sync requires courses to exist first; run `python manage.py seed_courses` before first sync.

### 5. Course Management

- Course model includes:
  - name
  - short name
  - description
  - duration in months
  - total fee
  - offer fee
  - fee type: monthly, quarterly, full
  - active flag
  - created timestamp
- Courses page route exists at `/courses`.
- Course list API returns all courses ordered by name.
- Course update API supports partial updates.
- Seed command exists:
  - `python manage.py seed_courses`
- Course aliases are supported through:
  - `COURSE_ALIAS_MAP` in sync logic
  - `CourseAlias` database model
  - Django Admin-managed alias table
- Course alias system maps sheet variations such as short names to canonical course records.

### 6. Enrollment Management

- Enrollment model supports multiple courses per student.
- Enrollment fields include:
  - student
  - course
  - roll number
  - session
  - status: active, completed, dropped
  - start date
  - end date
  - fee amount
  - note
  - created timestamp
- Enrollments are ordered by latest start date.
- Student enrollment endpoint supports:
  - `GET` enrollments for a student
  - `POST` create enrollment for a student
- Enrollment update endpoint supports `PATCH`.
- Form Sheet sync auto-creates enrollments when the course exists in DB.
- Admission Details sync can update roll number, session, joining date, fee amount, and enrollment status.

### 7. Fee Management

- Fee model was redesigned into:
  - `FeeStructure`
  - `FeePayment`
- `FeeStructure` is one-to-one with an enrollment.
- Fee structure fields include:
  - total fee
  - discount
  - auto-calculated final fee
  - note
  - created timestamp
- Fee structure computed properties:
  - total paid
  - balance
- `FeePayment` supports:
  - amount
  - payment date
  - payment mode: cash or online
  - auto-generated receipt number
  - note
  - created timestamp
- Fees page includes:
  - fee structure list
  - add fee structure modal
  - student and enrollment selection
  - enrollment-based total fee auto-fill
  - discount and final fee preview
  - expandable payment history
  - add payment modal
  - delete payment action
  - refresh action
- Fee summary currently shows:
  - current month received amount
  - active students count
- Backend fee summary endpoint also calculates:
  - total final fee
  - total paid
  - total balance
  - total fee structures/students

### 8. Fee Receipt PDF

- Receipt generation lives in `frontend/src/lib/generateReceipt.js`.
- PDF uses jsPDF and jspdf-autotable.
- Receipt includes:
  - Code Core branding
  - logo
  - student details
  - course and enrollment information
  - payment history
  - total fee, discount, paid amount, balance
  - stamp image
  - watermark/ad/footer style content
- Receipt uses `Rs.` text for currency compatibility with default PDF fonts.
- Student photo can be loaded through the backend Google Drive proxy.
- Fees page supports direct PDF download from the payment history row.

### 9. Email Receipt

- Email receipt API exists at `/api/fees/payments/send-receipt/`.
- Frontend generates PDF as base64 and sends it to backend.
- Backend sends HTML email with PDF attachment through Django email utilities.
- Email template includes:
  - branded header
  - payment success section
  - receipt details table
  - institute signature
  - WhatsApp, Google Maps, Instagram links
  - ISO certification footer
- `.env` needs Gmail SMTP settings and Gmail App Password.

### 10. WhatsApp Payment Notification

- Fees page creates a `wa.me` link for each payment.
- Message includes:
  - institute name
  - student name
  - receipt number
  - amount
  - course
  - payment date
  - contact and website
- Phone number is sanitized to the last 10 digits before creating the WhatsApp URL.
- WhatsApp message uses simple bold/italic formatting.

### 11. Attendance Management

- Attendance model stores:
  - student
  - date
  - status: present, absent, leave, holiday
  - note
  - created timestamp
- Unique attendance record per student per date is enforced.
- Attendance page has two main tabs:
  - Mark Attendance
  - Attendance Report
- Mark Attendance workflow includes:
  - date navigation
  - active student list
  - per-student status selection
  - bulk status setting
  - save action
  - active-student-only validation on backend
- Attendance report workflow includes:
  - month selector
  - KPI cards
  - daily attendance trend
  - course summary
  - needs-attention list
  - follow-up list for consecutive absences
  - sortable student report table
- Interactive drill-down drawers are implemented:
  - student drawer
  - course drawer
  - day drawer
- Student drawer includes:
  - student/course info
  - attendance percentage
  - present/absent/leave stats
  - calendar heatmap
  - month, last 3 months, and year filter options
- Course drawer shows course-level stats and related students.
- Day drawer shows that day's attendance details.
- Holiday logic is implemented:
  - holiday records are shown separately
  - holidays are excluded from percentage calculations
  - weekend days can appear as holiday-style unmarked days in daily trend
  - holidays do not break consecutive absent streak calculation
- Low attendance is flagged below 75%.
- Consecutive absence follow-up is calculated from latest attendance records.

### 12. UI/UX Work

- Modern dashboard-style UI built with Tailwind and shadcn-style components.
- Consistent use of cards, badges, tables, dialogs, buttons, inputs, and select controls.
- Lucide icons are used across major actions.
- Tables include loading, empty, and error states.
- Students page includes pagination and sorting.
- Fees page uses expandable rows for payment history.
- Attendance page includes responsive report cards and slide-in drawers.
- Toast notifications provide feedback for sync, save, email, payment, and error flows.

### 13. Backend Architecture

- Django apps currently present:
  - students
  - fees
  - attendance
  - users
  - results
- Root API routes:
  - `/api/students/`
  - `/api/auth/`
  - `/api/fees/`
  - `/api/attendance/`
- Django admin route:
  - `/admin/`
- Non-API routes fall back to frontend `index.html`.
- Media serving is configured through Django settings during development.
- Serializers are used for students, courses, enrollments, fees, payments, and attendance.
- Model save logic handles:
  - fee final amount calculation
  - receipt number generation
- Querysets use `select_related`/`prefetch_related` in key fee, attendance, and student endpoints.

## Key API Endpoints

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/login/` | Login and receive access/refresh tokens |
| POST | `/api/auth/logout/` | Logout and blacklist refresh token |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| GET | `/api/auth/me/` | Current logged-in user profile |

### Students, Courses, Enrollments

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/students/` | List students |
| GET/PATCH | `/api/students/<id>/` | Student detail/update |
| GET | `/api/students/stats/` | Dashboard stats |
| GET | `/api/students/courses/` | List courses |
| PATCH | `/api/students/courses/<id>/` | Update course |
| GET/POST | `/api/students/<id>/enrollments/` | Student enrollments |
| PATCH | `/api/students/enrollments/<id>/` | Update enrollment |
| POST | `/api/students/sync/` | Sync Google Form sheet |
| POST | `/api/students/sync-details/` | Sync Admission Details sheet |
| POST | `/api/students/sync-all/` | Combined sync |
| GET | `/api/students/proxy-image/?id=<drive_file_id>` | Google Drive image proxy |

### Fees

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/fees/` | List fee structures |
| POST | `/api/fees/create/` | Create fee structure |
| GET/PATCH | `/api/fees/<id>/` | Fee structure detail/update |
| GET | `/api/fees/summary/` | Fee summary |
| POST | `/api/fees/payments/create/` | Add payment |
| DELETE | `/api/fees/payments/<id>/delete/` | Delete payment |
| POST | `/api/fees/payments/send-receipt/` | Send email receipt with PDF |

### Attendance

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/attendance/` | Attendance list by optional date/student filters |
| POST | `/api/attendance/mark/` | Mark/update daily attendance |
| GET | `/api/attendance/summary/` | Student attendance summary |
| GET | `/api/attendance/report/` | Monthly report |
| GET | `/api/attendance/calendar/` | Yearly calendar records for a student |

## Setup Notes

### Backend

```powershell
cd C:\nnn\codecore-ims\backend
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_courses
python manage.py runserver
```

Backend local URL:

```text
http://127.0.0.1:8000/
```

### Frontend

```powershell
cd C:\nnn\codecore-ims\frontend
npm install
npm run dev
```

Frontend local URL:

```text
http://localhost:5173/
```

### Local WiFi Access

Backend:

```powershell
cd C:\nnn\codecore-ims\backend
.\venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
```

Frontend:

```powershell
cd C:\nnn\codecore-ims\frontend
npm run dev -- --host 0.0.0.0
```

Then open from another device on the same WiFi:

```text
http://<your-wifi-ip>:5173
```

Use `ipconfig` on Windows to find the current IPv4 address.

## Environment Requirements

Create `.env` inside `backend/` with values similar to:

```env
SECRET_KEY=your_django_secret_key
DEBUG=True
DATABASE_URL=postgres://user:password@localhost:5432/codecore_db

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your_gmail_app_password

SHEET_KEY_FILE=codecore-sheets-key.json
SPREADSHEET_NAME=your_form_sheet_name
DETAILS_SPREADSHEET_NAME=your_details_sheet_name
```

Important:

- PostgreSQL service must be running.
- Google service account key file `codecore-sheets-key.json` must be present in `backend/`.
- Gmail receipt sending requires a Gmail App Password, not the normal Gmail password.
- Courses must be seeded before first sheet sync.

## Current Workflow Summary

1. Start PostgreSQL.
2. Start backend server.
3. Start frontend dev server.
4. Login.
5. Run `seed_courses` once before first real sync.
6. Open Students page and click `Sync`.
7. Verify students/enrollments.
8. Create or review fee structures.
9. Add payments and generate/send receipts.
10. Mark daily attendance.
11. Use Attendance Report for monthly review, low attendance, and follow-up.

## Important Business Rules

- A student can have multiple enrollments.
- Fee structure belongs to an enrollment, not directly to a student.
- Receipt number is generated automatically when a payment is saved.
- Attendance can have only one record per student per date.
- Only active students are considered while marking attendance.
- Holidays are visible in reports but excluded from attendance percentage.
- Course names from sheets must match seeded courses or mapped aliases.
- Google Drive student photo URLs should be loaded through thumbnail/proxy flow to avoid CORS issues.

## Recent Updates

- Combined student sync button and `/api/students/sync-all/` endpoint.
- Admission Details sync added for roll number, session, joining date, fee, and status updates.
- Course alias DB model added for sheet course-name variations.
- Student list improved with status tabs, search, sorting, pagination, and add-student modal.
- Fee module redesigned around `FeeStructure` and `FeePayment`.
- Premium receipt PDF generation added.
- Email receipt with attached PDF added.
- WhatsApp payment confirmation link added.
- Attendance module expanded significantly:
  - mark attendance tab
  - monthly report API
  - daily trend
  - low attendance
  - consecutive absence follow-up
  - course/student/day drill-down drawers
  - calendar heatmap
  - holiday-aware percentage logic
- Static frontend fallback added in Django root URLs.

## Pending / Not Fully Built Yet

- Results module is only a placeholder page and has no real feature implementation yet.
- README still contains some older endpoint names and garbled symbols; it should be cleaned separately.
- Automated tests are present as app files but meaningful test coverage still needs to be added.
- Production deployment settings, environment separation, and security hardening should be reviewed before going live.
- Attendance export/print reports are not documented as implemented.
- Fee analytics can be expanded beyond current month received and active students.

## Files Worth Knowing

- `backend/students/models.py` - Course, Student, Enrollment, CourseAlias
- `backend/students/sheet_sync.py` - Google Sheets sync logic
- `backend/students/views.py` - Student, course, enrollment, sync APIs
- `backend/fees/models.py` - FeeStructure and FeePayment
- `backend/fees/views.py` - Fee APIs and email receipt sender
- `backend/attendance/models.py` - Attendance model
- `backend/attendance/views.py` - Attendance marking, summary, report, calendar APIs
- `frontend/src/pages/Students.jsx` - Student list, sync, add modal
- `frontend/src/pages/StudentDetail.jsx` - Student detail page
- `frontend/src/pages/Courses.jsx` - Course page
- `frontend/src/pages/Fees.jsx` - Fee UI, payments, PDF/email/WhatsApp actions
- `frontend/src/lib/generateReceipt.js` - Receipt PDF generation
- `frontend/src/pages/Attendance.jsx` - Attendance UI and reporting drawers
- `frontend/src/App.jsx` - Frontend routes
- `backend/config/urls.py` - Backend route mounting and frontend fallback
