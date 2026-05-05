import gspread
from google.oauth2.service_account import Credentials
from decouple import config
from django.utils import timezone
from .models import Student, Course

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

def get_sheet():
    creds = Credentials.from_service_account_file(
        config("SHEET_KEY_FILE"),
        scopes=SCOPES
    )
    client = gspread.authorize(creds)
    sheet  = client.open(config("SPREADSHEET_NAME")).sheet1
    return sheet


def clean(value):
    """
    Koi bhi value aaye — int, float, None, string —
    sab ko safely string mein convert karo
    """
    if value is None:
        return ""
    return str(value).strip()


def parse_date(date_str):
    """Google Form date format handle karo"""
    from datetime import datetime
    if not date_str:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(clean(date_str), fmt).date()
        except ValueError:
            continue
    return None


def sync_students_from_sheet():
    sheet   = get_sheet()
    rows    = sheet.get_all_records()

    created = 0
    skipped = 0

    for index, row in enumerate(rows, start=2):
        email = clean(row.get("Email"))

        if not email:
            skipped += 1
            continue

        # Already exist karta hai toh skip
        if Student.objects.filter(email=email).exists():
            skipped += 1
            continue

        # Course match karo
        course_name = clean(row.get("Course"))
        course      = Course.objects.filter(name__icontains=course_name).first()

        # Student create karo
        Student.objects.create(
            name                = clean(row.get("Name")),
            father_name         = clean(row.get("Father's Name")),
            mother_name         = clean(row.get("Mother's Name")),
            dob                 = parse_date(clean(row.get("Date of Birth"))),
            gender              = clean(row.get("  Gender  ")),        # ← spaces ke saath exactly
            qualification       = clean(row.get("Educational Qualification")),
            address             = clean(row.get("Address")),
            phone               = clean(row.get("Phone number")),
            email               = clean(row.get("Email")),
            photo_url           = clean(row.get("  Upload Your Photo  ")),   # ← spaces ke saath
            aadhaar_front_url   = clean(row.get("Copy of Aadhaar Card (Front Side)")),
            aadhaar_back_url    = clean(row.get("Copy of Aadhaar Card (Back Side)")),
            aadhaar_number      = clean(row.get("Aadhaar Number")),
            comments            = clean(row.get("Comments")),
            course              = course,
            sheet_row           = index,
            synced_at           = timezone.now(),
        )
        created += 1

    return {"created": created, "skipped": skipped}