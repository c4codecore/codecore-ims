import gspread
from google.oauth2.service_account import Credentials
from decouple import config
from django.utils import timezone
from .models import Student, Course, Enrollment
from datetime import datetime

# ── Course name mapping: Sheet value (uppercase key) → DB name ───────────────
COURSE_MAPPING = {
    "CERTIFICATE IN OFFICE AUTOMATION"                      : "Certificate in Office Automation",
    "CERTIFICATE IN WEB DEVELOPMENT"                        : "Certificate in Web Development",
    "CERTIFICATE IN WEB DESIGNING"                          : "Certificate in Web Designing",
    "CERTIFICATE IN PROGRAMMING LANGUAGE"                   : "Certificate in Programming Language",
    "CERTIFICATE IN DATA ANALYTICS"                         : "Certificate in Data Analytics",
    "CERTIFICATE IN ADVANCED EXCEL + TALLY"                 : "Certificate in Advanced Excel + Tally",
    "CERTIFICATE IN ADVANCED EXCEL"                         : "Certificate in Advanced Excel",
    "CERTIFICATE IN ANALYZING DATA WITH MICROSOFT POWER BI" : "Certificate in Power BI",
    "CERTIFICATE IN SOFTWARE TESTING"                       : "Certificate in Software Testing",
    "DIPLOMA IN COMPUTER APPLICATION"                       : "Diploma in Computer Applications",
    "ADVANCED DIPLOMA IN COMPUTER APPLICATION"              : "Advanced Diploma in Computer Applications",
    "BASIC COMPUTER COURSE"                                 : "Basic Computer Course",
    "TYPING COURSE"                                         : "Typing Course",
    "OTHER"                                                 : "Other",
    "Other"                                                 : "Other",
}

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]


def get_sheet():
    creds = Credentials.from_service_account_file(
        config("SHEET_KEY_FILE"), scopes=SCOPES
    )
    client = gspread.authorize(creds)
    sheet = client.open(config("SPREADSHEET_NAME")).sheet1
    return sheet


def clean(value):
    if value is None:
        return ""
    return str(value).strip()


def parse_date(date_str):
    if not date_str:
        return None
    for fmt in (
        "%d/%m/%Y",
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%d-%b-%Y",  # ← YEH ADD KARO — "4-Jun-2004" format
    ):
        try:
            return datetime.strptime(clean(date_str), fmt).date()
        except ValueError:
            continue
    return None


def sync_students_from_sheet():
    sheet = get_sheet()
    rows = sheet.get_all_records()

    created = 0
    updated = 0
    skipped = 0

    for index, row in enumerate(rows, start=2):
        email = clean(row.get("Email"))

        if not email:
            skipped += 1
            continue

        # Course match via COURSE_MAPPING (case-insensitive key, then exact key fallback)
        course_raw  = clean(row.get("Course")).strip()
        mapped_name = COURSE_MAPPING.get(course_raw.upper(), COURSE_MAPPING.get(course_raw))
        course      = Course.objects.filter(name=mapped_name).first() if mapped_name else None

        # update_or_create — naya bhi, purana bhi update hoga
        student, was_created = Student.objects.update_or_create(
            email=email,  # ← unique identifier
            defaults={
                "name": clean(row.get("Name")),
                "father_name": clean(row.get("Father Name")),
                "mother_name": clean(row.get("Mother Name")),
                "dob": parse_date(clean(row.get("Date of Birth"))),
                "gender": clean(row.get("  Gender  ")),
                "qualification": clean(row.get("Educational Qualification")),
                "address": clean(row.get("Address")),
                "phone": clean(row.get("Phone number")),
                "photo_url": clean(row.get("  Upload Your Photo  ")),
                "aadhaar_front_url": clean(
                    row.get("Copy of Aadhaar Card (Front Side)")
                ),
                "aadhaar_back_url": clean(row.get("Copy of Aadhaar Card (Back Side)")),
                "aadhaar_number": clean(row.get("Aadhaar Number")),
                "comments": clean(row.get("Comments")),
                "course": course,
                "sheet_row": index,
                "synced_at": timezone.now(),
            },
        )
        print("Student Name", student.name)
        if student.name =="Neha":
            print("Course", course.name if course else None)
            print("Enrollment Exists", Enrollment.objects.filter(student=student, course=course)    )
        if course and not Enrollment.objects.filter(student=student, course=course).exists():
            Enrollment.objects.create(
                student    = student,
                course     = course,
                status     = student.status,
                start_date = student.admission_date.date() if student.admission_date else timezone.now().date(),
                fee_amount = student.total_fees,
            )

        if was_created:
            created += 1
        else:
            updated += 1

    return {"created": created, "updated": updated, "skipped": skipped}
