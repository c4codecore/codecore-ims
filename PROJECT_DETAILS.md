# CodeCore IMS - Project Details

## Overview
CodeCore IMS (Institute Management System) is a comprehensive platform designed for educational institutes to manage students, enrollments, fees, attendance, and results.

## Technology Stack
- **Frontend**: React.js, Tailwind CSS, Shadcn UI, Lucide Icons, Axios.
- **Backend**: Django, Django REST Framework (DRF), PostgreSQL/SQLite.
- **Integrations**: Google Sheets API (for student data sync), JWT Authentication.

---

## Core Features & Work Completed

### 1. Student Management
- **Centralized Database**: Storage for detailed student information (personal details, parent info, documents, etc.).
- **Google Sheets Sync**: Automated synchronization of student data from Google Forms/Sheets directly into the system.
- **Active/Inactive Status**: Tracking student status (Active, Completed, Dropped).

### 2. Multi-Course Enrollment
- **Enrollment Model**: Supports students enrolling in multiple courses simultaneously.
- **Status Tracking**: Each enrollment has its own status, start date, and fee configuration.
- **Migration Tools**: Custom Django management command (`create_enrollments`) to transition legacy student data to the new enrollment model.

### 3. Fee Management (Recently Restructured)
- **Fee Structures**: Define total fees and discounts for each student enrollment.
- **Payment Tracking**: Record individual payment installments with support for Cash and Online modes.
- **Automated Receipts**: Unique receipt number generation for every payment.
- **Dashboard Summary**: Real-time calculation of:
    - Total Final Fee (all students)
    - Total Collected Amount
    - Total Pending Balance
    - Total Student Count
- **Interactive UI**:
    - Summary cards with vibrant aesthetics.
    - Expandable table rows to view payment history without leaving the page.
    - Modals for adding fee structures and processing new payments.

### 4. Dashboard & UI/UX
- **Modern Design**: Built with a "premium" aesthetic using Shadcn UI and custom Tailwind styling.
- **Analytics**: Key metrics displayed on the home/fees pages for quick institute monitoring.
- **Responsive Layout**: Sidebar navigation and mobile-friendly tables.

### 5. Backend Architecture
- **JWT Auth**: Secure API access using `access_token` stored in localStorage.
- **RESTful APIs**: Well-defined endpoints for students, enrollments, fees, and summaries.
- **Signals/Overridden Saves**: Automatic calculation of final fees and receipt numbering.

---

## Recent Updates (May 2026)
- **Fee Model Overhaul**: Moved from a simple flat-fee system to a structured `Structure -> Payments` architecture.
- **UI Refresh**: Complete rewrite of the Fee Management page (`Fees.jsx`) with expandable history and modern modals.
- **Enrollment Sync**: Updated `sheet_sync.py` to automatically create Enrollments when syncing students from Google Sheets.
