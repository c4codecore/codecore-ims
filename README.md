# CodeCore IMS
### Institute Management System — Code Core Computer Center, Gurugram

A full-stack web application to manage students, courses, enrollments, fees, and attendance.

**Backend:** Django REST Framework + PostgreSQL  
**Frontend:** React + Vite + Tailwind CSS + shadcn/ui

---

## 🌟 Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Active students count, total courses overview |
| **Students** | Add/view students, manage status, student detail page |
| **Courses** | View all courses (managed via `seed_courses` command) |
| **Enrollments** | Auto-created during Google Sheet sync |
| **Google Sheets Sync** | Two sources — Google Form responses + Staff Admission Details sheet |
| **Fees** | Fee structures, payment tracking, balance overview |
| **Fee Receipt PDF** | Premium PDF with student photo, payment history, stamp |
| **Email Receipt** | HTML email with PDF attachment via Gmail SMTP |
| **WhatsApp Notification** | Pre-filled payment confirmation message |
| **Attendance** | Attendance tracking |

---

## ⚙️ Prerequisites

Make sure the following are installed:

- Python 3.x
- Node.js v18+
- PostgreSQL (must be running)
- Git

---

## 🚀 First Time Setup

### 1️⃣ Clone the Repository

```powershell
git clone <your-repo-url>
cd codecore-ims
```

---

### 2️⃣ Backend Setup (Django)

```powershell
cd backend
```

**Activate virtual environment:**
```powershell
.\venv\Scripts\activate
```

**Install dependencies:**
```powershell
pip install -r requirements.txt
```

**Set up `.env` file** inside `backend/`:
```env
SECRET_KEY=your_django_secret_key
DEBUG=True
DATABASE_URL=postgres://user:password@localhost:5432/codecore_db

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx

SHEET_KEY_FILE=codecore-sheets-key.json
SPREADSHEET_NAME=your_form_sheet_name
DETAILS_SPREADSHEET_NAME=your_details_sheet_name
```

> ⚠️ `codecore-sheets-key.json` (Google Service Account key) must also be present in `backend/`

**Apply migrations:**
```powershell
python manage.py migrate
```

**Create superuser (first time only):**
```powershell
python manage.py createsuperuser
```

**Seed courses (IMPORTANT — do before any sync):**
```powershell
python manage.py seed_courses
```

**Start backend server:**
```powershell
python manage.py runserver
```

Backend runs at: `http://127.0.0.1:8000/`

---

### 3️⃣ Frontend Setup (React + Vite)

Open a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173/`

---

## 🔄 Daily Startup (After First Setup)

```powershell
# Terminal 1 — Backend
cd backend
.\venv\Scripts\activate
python manage.py runserver

# Terminal 2 — Frontend
cd frontend
npm run dev
```

---

## Local WiFi Startup (Frontend + Backend)

Use these commands when you want to run the app on your computer and access it from other devices on the same WiFi.

```powershell
# Terminal 1 - Backend
cd C:\nnn\codecore-ims\backend
.\venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
```

```powershell
# Terminal 2 - Frontend
cd C:\nnn\codecore-ims\frontend
npm run dev -- --host 0.0.0.0
```

Open the app from any device on the same WiFi:

```text
http://192.168.1.7:5173
```

Backend/API URL:

```text
http://192.168.1.7:8000
```

If the site does not open on another device, allow Python and Node.js through Windows Firewall for Private networks.

---

## 📊 Google Sheets Sync — Correct Order

> ⚠️ Always follow this order. Wrong order = missing enrollments.

| Step | Action | What happens |
|------|--------|--------------|
| 1 | `python manage.py seed_courses` | Courses DB mein aati hain |
| 2 | Click **Sync Form Sheet** | Google Form responses → Students + Enrollments create hote hain |
| 3 | Click **Sync Admission Details** | Roll No., fees, joining date, status update hota hai |

---

## 🔑 Gmail App Password Setup

Email receipts ke liye normal Gmail password kaam nahi karta — App Password chahiye:

1. Google Account → **Security** → 2-Step Verification ON karo
2. Security → **App Passwords** → "Mail" select karo → Generate
3. 16-digit password milega — `.env` mein `EMAIL_HOST_PASSWORD` mein daalo

---

## ⚠️ Common Mistakes

- `seed_courses` **pehle** run karo — warna Sheet sync se enrollments nahi banenge
- `.env` aur `codecore-sheets-key.json` dono `backend/` folder mein hone chahiye
- PostgreSQL service running honi chahiye backend start karne se pehle
- Gmail **App Password** use karo, normal password nahi

---

## 📁 Project Structure

```
codecore-ims/
├── backend/
│   ├── attendance/
│   ├── config/              ← Django settings, urls
│   ├── fees/                ← models, views, serializers, urls
│   ├── results/
│   ├── students/            ← models, views, serializers, sheet_sync.py
│   │   └── management/
│   │       └── commands/
│   │           └── seed_courses.py
│   ├── users/
│   ├── .env                 ← environment variables
│   ├── codecore-sheets-key.json
│   └── manage.py
└── frontend/
    ├── public/
    │   ├── logo.png
    │   └── stamp.png
    └── src/
        ├── api/             ← axios instance
        ├── components/      ← shadcn/ui components
        ├── hooks/
        ├── lib/
        │   └── generateReceipt.js
        └── pages/
            ├── Attendance.jsx
            ├── Courses.jsx
            ├── Dashboard.jsx
            ├── Fees.jsx
            ├── Login.jsx
            ├── StudentDetail.jsx
            └── Students.jsx
```

---

## 🛠️ Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/token/` | Login — JWT token |
| GET | `/api/students/` | All students |
| GET | `/api/students/{id}/enrollments/` | Student enrollments |
| GET | `/api/students/courses/` | All courses |
| GET | `/api/fees/` | All fee structures with payments |
| GET | `/api/fees/summary/` | Total fee, collected, balance |
| POST | `/api/fees/create/` | New fee structure |
| POST | `/api/fees/payments/create/` | Add payment |
| DELETE | `/api/fees/payments/{id}/delete/` | Delete payment |
| POST | `/api/fees/payments/send-receipt/` | Email PDF receipt |
| POST | `/api/students/sync-sheet/` | Sync Google Form sheet |
| POST | `/api/students/sync-details/` | Sync Admission Details sheet |

---

*CodeCore Computer Center, Gurugram — Empowering Futures Through Technology*
