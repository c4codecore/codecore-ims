# CodeCore Institute Management System (IMS)

This is a full-stack web application built to manage students, courses, fees, and enrollments for CodeCore. The project consists of a Django backend (REST API) and a React frontend (Vite).

## 🚀 How to Start the Project Locally

Follow these steps to set up and run both the backend and frontend on your local machine.

### Prerequisites
Make sure you have the following installed on your system:
- **Python 3.x**
- **Node.js** (v18+ recommended)
- **Git**

---

### 1️⃣ Backend Setup (Django API)

1. **Open a terminal and navigate to the backend folder:**
   ```powershell
   cd backend
   ```

2. **Activate the Virtual Environment:**
   *(Since you are on Windows, use the following command)*
   ```powershell
   .\venv\Scripts\activate
   ```
   *Note: Once activated, if you need to install or update dependencies, run `pip install -r requirements.txt`.*

3. **Set up Environment Variables & Credentials:**
   - Ensure you have a `.env` file inside the `backend` directory with your database and Django configurations.
   - For Google Sheet synchronization, ensure the `codecore-sheets-key.json` file is present in the `backend` folder and properly referenced in your `.env`.

4. **Apply Database Migrations:**
   ```powershell
   python manage.py migrate
   ```

5. **Start the Django Development Server:**
   ```powershell
   python manage.py runserver
   ```
   The backend API will now be running at `http://127.0.0.1:8000/`.

---

### 2️⃣ Frontend Setup (React + Vite)

1. **Open a new/split terminal and navigate to the frontend folder:**
   ```powershell
   cd frontend
   ```

2. **Install Node Dependencies:**
   *(You only need to do this the first time or if `package.json` changes)*
   ```powershell
   npm install
   ```

3. **Start the React Development Server:**
   ```powershell
   npm run dev
   ```
   The frontend will now be running (usually at `http://localhost:5173/`). Open this URL in your browser to access the CodeCore IMS application.

---

### 🌟 Key Features
- **Dashboard:** Overview of active students and total courses.
- **Student Management:** Add new students, view details, and manage status.
- **Auto-Enrollment:** Automatically enrolls a student into a course upon creation.
- **Google Sheets Sync:** Pulls Google Form responses directly into the application database.
- **Fee Management:** Track payments and generate/download PDF fee receipts.
