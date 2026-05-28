# CodeCore IMS

Institute Management System for Code Core Computer Center, Gurugram.

CodeCore IMS is a full-stack web application for managing students, courses, enrollments, fee collection, receipts, and attendance.

## Tech Stack

- Backend: Django, Django REST Framework, PostgreSQL, SimpleJWT
- Frontend: React, Vite, Tailwind CSS, shadcn/ui style components, Radix UI, Lucide icons
- Integrations: Google Sheets API, Google Drive image proxy, Gmail SMTP, WhatsApp links
- PDF: jsPDF and jspdf-autotable

## Features

| Module | Status | Description |
| --- | --- | --- |
| Dashboard | Done | Active student count and course overview |
| Auth | Done | Login, logout, token refresh, current user profile |
| Students | Done | Student list, status tabs, search, sorting, pagination, manual add, detail page |
| Courses | Done | Course listing and update support; courses seeded by management command |
| Enrollments | Done | Multiple enrollments per student with roll number, session, dates, fee amount, status |
| Google Sheets Sync | Done | Combined sync for Google Form responses and Staff Admission Details sheet |
| Fees | Done | Fee structures, installments, payment history, balances |
| PDF Receipt | Done | Branded receipt PDF with logo, stamp, student/payment details |
| Email Receipt | Done | HTML email with attached PDF receipt through Gmail SMTP |
| WhatsApp Notification | Done | Pre-filled payment confirmation through `wa.me` |
| Attendance | Done | Mark attendance, monthly report, low attendance, follow-up, calendar/drill-down drawers |
| Results | Pending | Placeholder route only |

For a fuller implementation log, see `PROJECT_DETAILS.md`.

## Prerequisites

- Python 3.x
- Node.js 18+
- PostgreSQL
- Git
- Google service account key for Sheets sync
- Gmail App Password for email receipts

## First Time Setup

### 1. Clone Repository

```powershell
git clone <your-repo-url>
cd codecore-ims
```

### 2. Backend Setup

```powershell
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` inside `backend/`:

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

Place the Google service account key in:

```text
backend/codecore-sheets-key.json
```

Apply migrations:

```powershell
python manage.py migrate
```

Create an admin user:

```powershell
python manage.py createsuperuser
```

Seed courses before any sheet sync:

```powershell
python manage.py seed_courses
```

Start backend:

```powershell
python manage.py runserver
```

Backend URL:

```text
http://127.0.0.1:8000/
```

### 3. Frontend Setup

Open a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173/
```

## Daily Startup

Terminal 1:

```powershell
cd C:\nnn\codecore-ims\backend
.\venv\Scripts\activate
python manage.py runserver
```

Terminal 2:

```powershell
cd C:\nnn\codecore-ims\frontend
npm run dev
```

## Local WiFi Startup

Use this when you want to open the app from another device on the same WiFi.

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

Open from another device:

```text
http://<your-wifi-ip>:5173
```

Backend/API:

```text
http://<your-wifi-ip>:8000
```

Find your Windows WiFi IP:

```powershell
ipconfig
```

Use the IPv4 address shown under your active WiFi adapter. If another device cannot open the app, allow Python and Node.js through Windows Firewall for Private networks.

## Google Sheets Sync

Correct order:

| Step | Action | Result |
| --- | --- | --- |
| 1 | `python manage.py seed_courses` | Courses are inserted into the database |
| 2 | Click `Sync` on Students page | Form Sheet sync runs first, then Admission Details sync runs |
| 3 | Review Students and Fees pages | Students, enrollments, roll numbers, sessions, dates, status, and fee data are updated |

Important:

- Courses must exist before sync, otherwise enrollments cannot map correctly.
- Course aliases are supported through code and the `CourseAlias` model.
- The combined sync endpoint is `/api/students/sync-all/`.
- Individual endpoints also exist: `/api/students/sync/` and `/api/students/sync-details/`.

## Gmail App Password Setup

Normal Gmail password will not work for receipt emails.

1. Turn on 2-Step Verification in your Google Account.
2. Open App Passwords.
3. Generate an app password for Mail.
4. Put the 16-character password in `.env` as `EMAIL_HOST_PASSWORD`.

## Common Mistakes

- Do not run Sheet sync before `python manage.py seed_courses`.
- Keep `.env` inside `backend/`.
- Keep `codecore-sheets-key.json` inside `backend/`.
- Make sure PostgreSQL is running before starting Django.
- Use Gmail App Password, not your normal Gmail password.
- Use `/api/auth/login/`, not the older `/api/token/` route.
- Use `/api/students/sync-all/` for the current single-button sync flow.

## Project Structure

```text
codecore-ims/
  backend/
    attendance/
    config/
    fees/
    results/
    students/
      management/
        commands/
          seed_courses.py
      sheet_sync.py
    users/
    manage.py
    requirements.txt
  frontend/
    public/
      logo.png
      stamp.png
    src/
      api/
        axios.js
      components/
      hooks/
        useAuth.jsx
        useToast.jsx
      lib/
        generateReceipt.js
      pages/
        Attendance.jsx
        Courses.jsx
        Dashboard.jsx
        Fees.jsx
        Login.jsx
        StudentDetail.jsx
        Students.jsx
  PROJECT_DETAILS.md
  README.md
```

## Key API Endpoints

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/login/` | Login and receive access/refresh tokens |
| POST | `/api/auth/logout/` | Logout and blacklist refresh token |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| GET | `/api/auth/me/` | Current logged-in user |

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
| GET | `/api/attendance/` | Attendance list with optional date/student filters |
| POST | `/api/attendance/mark/` | Mark/update daily attendance |
| GET | `/api/attendance/summary/` | Student attendance summary |
| GET | `/api/attendance/report/` | Monthly report |
| GET | `/api/attendance/calendar/` | Student yearly calendar records |

## Attendance Rules

- Supported statuses: present, absent, leave, holiday.
- Only active students are marked from the attendance UI.
- One attendance record is allowed per student per date.
- Holidays are shown separately and excluded from attendance percentage.
- Low attendance is flagged below 75%.

## Fee Rules

- Fee structure belongs to an enrollment.
- Final fee is calculated as total fee minus discount.
- Balance is calculated as final fee minus all payments.
- Receipt number is generated automatically for every payment.
- Receipt PDF can be downloaded, emailed, or used for WhatsApp confirmation.

## Deployment Notes

- Django root URLs include a frontend fallback for non-API routes.
- Built frontend static files can be served through Django static configuration.
- Review `DEBUG`, allowed hosts, database URL, CORS/network settings, email credentials, and secret keys before production use.

---

Code Core Computer Center, Gurugram - Empowering Futures Through Technology
