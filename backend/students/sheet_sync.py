import gspread
from google.oauth2.service_account import Credentials
from decouple import config
from django.utils import timezone
from .models import Student, Course, Enrollment, CourseAlias
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────────────
# COURSE ALIAS MAP  (hardcoded fallback)
# Key   = sheet mein jo bhi aaye (lowercase, stripped)
# Value = DB mein exact Course.name  (seed_courses.py wala naam)
# ─────────────────────────────────────────────────────────────────────────────
COURSE_ALIAS_MAP = {
    "certificate in office automation"                       : "Certificate in Office Automation",
    "office automation"                                      : "Certificate in Office Automation",
    "certificate in web development"                         : "Certificate in Web Development",
    "diploma in web development"                             : "Certificate in Web Development",
    "web development"                                        : "Certificate in Web Development",
    "certificate in web designing"                           : "Certificate in Web Designing",
    "certificate in web desining"                            : "Certificate in Web Designing",
    "web designing"                                          : "Certificate in Web Designing",
    "certificate in programming language"                    : "Certificate in Programming Language",
    "c language"                                             : "Certificate in Programming Language",
    "python programming"                                     : "Certificate in Programming Language",
    "python"                                                 : "Certificate in Programming Language",
    "javascript"                                             : "Certificate in Programming Language",
    "js"                                                     : "Certificate in Programming Language",
    "certificate in data analytics"                          : "Certificate in Data Analytics",
    "certificate in analyzing data with microsoft power bi"  : "Certificate in Data Analytics",
    "data analytics"                                         : "Certificate in Data Analytics",
    "mysql + powerbi"                                        : "Certificate in Data Analytics",
    "certificate in power bi"                                : "Certificate in Data Analytics",
    "power bi"                                               : "Certificate in Data Analytics",
    "certificate in advanced excel + tally"                  : "Certificate in Advanced Excel + Tally",
    "advanced excel + tally"                                 : "Certificate in Advanced Excel + Tally",
    "certificate in advanced excel"                          : "Certificate in Advanced Excel",
    "advanced excel"                                         : "Certificate in Advanced Excel",
    "word  excel"                                            : "Certificate in Advanced Excel",
    "word & excel"                                           : "Certificate in Advanced Excel",
    "excel + gmail"                                          : "Certificate in Advanced Excel",
    "certificate in software testing"                        : "Certificate in Software Testing",
    "software testing"                                       : "Certificate in Software Testing",
    "certificate in tally"                                   : "Tally Prime",
    "tally"                                                  : "Tally Prime",
    "tally prime"                                            : "Tally Prime",
    "diploma in computer application"                        : "Diploma in Computer Applications",
    "diploma in computer applications"                       : "Diploma in Computer Applications",
    "dca"                                                    : "Diploma in Computer Applications",
    "advanced diploma in computer application"               : "Advanced Diploma in Computer Applications",
    "advanced diploma in computer applications"              : "Advanced Diploma in Computer Applications",
    "advance diploma in computer application (adca) 1 year" : "Advanced Diploma in Computer Applications",
    "adca"                                                   : "Advanced Diploma in Computer Applications",
    "basic computer course"                                  : "Basic Computer Course",
    "basic computer course (bcc)"                            : "Basic Computer Course",
    "bcc"                                                    : "Basic Computer Course",
    "typing course"                                          : "Typing Course",
    "typing"                                                 : "Typing Course",
    "tution"                                                 : "Tuition",
    "tuition"                                                : "Tuition",
    "other"                                                  : "Other",
    "certificate in office automation\ncertificate in tally\ncertificate in sql": "Certificate in Office Automation",
}

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def get_client():
    creds = Credentials.from_service_account_file(
        config("SHEET_KEY_FILE"), scopes=SCOPES
    )
    return gspread.authorize(creds)


def get_form_sheet():
    return get_client().open(config("SPREADSHEET_NAME")).sheet1


def get_details_sheet():
    """Staff wali Admission Details spreadsheet — 'Student Details' tab"""
    spreadsheet = get_client().open(config("DETAILS_SPREADSHEET_NAME"))
    try:
        return spreadsheet.worksheet("Student Details")
    except gspread.exceptions.WorksheetNotFound:
        return spreadsheet.sheet1


def clean(value):
    if value is None:
        return ""
    return str(value).strip()


def parse_date(date_str):
    if not date_str:
        return None
    s = clean(date_str).replace(" 00:00:00", "")
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y", "%d-%b-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def resolve_course(course_raw: str):
    if not course_raw:
        return None
    stripped = course_raw.strip()
    key      = stripped.lower()

    # 1. DB alias table (admin se manage)
    alias_obj = CourseAlias.objects.filter(alias__iexact=stripped).first()
    if alias_obj:
        return alias_obj.course

    # 2. Direct exact name
    direct = Course.objects.filter(name__iexact=stripped).first()
    if direct:
        return direct

    # 3. Hardcoded fallback map
    mapped_name = COURSE_ALIAS_MAP.get(key)
    if mapped_name:
        return Course.objects.filter(name__iexact=mapped_name).first()

    return None


def _merge_student_fields(student, row):
    """
    Sirf woh fields update karo jo DB mein abhi blank/null hain.
    Koi bhi existing value kabhi overwrite nahi hogi.
    Dono sources (Form sheet + Details sheet) ka best data merge ho jaata hai.
    """
    changed = False
    candidates = {
        "father_name"   : clean(row.get("Father's Name")),
        "mother_name"   : clean(row.get("Mother's Name")),
        "photo_url"     : clean(row.get("Student Image")),
        "address"       : clean(row.get("Full Address")),
        "qualification" : clean(row.get("Qualification")),
        "gender"        : clean(row.get("Gender")),
        "dob"           : parse_date(clean(row.get("Date of Birth"))),
        "phone"         : clean(row.get("Phone No.") or row.get("Phone number")),
    }
    for field, new_val in candidates.items():
        existing = getattr(student, field, None)
        # Sirf fill karo agar existing blank/null ho aur naya value ho
        if new_val and not existing:
            setattr(student, field, new_val)
            changed = True
    if changed:
        student.synced_at = timezone.now()
        student.save()


def _map_status(raw: str) -> str:
    mapping = {"completed": "completed", "active": "active", "dropped": "dropped", "inactive": "dropped"}
    return mapping.get(raw.lower().strip(), "") if raw else ""


def _parse_number(val):
    if not val:
        return None
    try:
        return float(str(val).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _parse_session(val):
    if not val:
        return None
    try:
        return int(float(str(val).strip()))
    except (ValueError, TypeError):
        return None


# ─────────────────────────────────────────────────────────────────────────────
# 1.  FORM SHEET SYNC
# ─────────────────────────────────────────────────────────────────────────────

def sync_students_from_sheet():
    """Google Form responses → Student + Enrollment create/update"""
    sheet = get_form_sheet()
    rows  = sheet.get_all_records()

    created = 0
    updated = 0
    skipped = 0
    errors  = []

    for index, row in enumerate(rows, start=2):
        email = clean(row.get("Email"))
        if not email:
            skipped += 1
            continue

        course = resolve_course(clean(row.get("Course")))

        try:
            student, was_created = Student.objects.update_or_create(
                email=email,
                defaults={
                    "name"              : clean(row.get("Name")),
                    "father_name"       : clean(row.get("Father Name")),
                    "mother_name"       : clean(row.get("Mother Name")),
                    "dob"               : parse_date(clean(row.get("Date of Birth"))),
                    "gender"            : clean(row.get("Gender") or row.get("  Gender  ")),
                    "qualification"     : clean(row.get("Educational Qualification")),
                    "address"           : clean(row.get("Address")),
                    "phone"             : clean(row.get("Phone number")),
                    "photo_url"         : clean(row.get("Upload Your Photo") or row.get("  Upload Your Photo  ")),
                    "aadhaar_front_url" : clean(row.get("Copy of Aadhaar Card (Front Side)")),
                    "aadhaar_back_url"  : clean(row.get("Copy of Aadhaar Card (Back Side)")),
                    "aadhaar_number"    : clean(row.get("Aadhaar Number")),
                    "comments"          : clean(row.get("Comments")),
                    "course"            : course,
                    "sheet_row"         : index,
                    "synced_at"         : timezone.now(),
                },
            )
        except Exception as e:
            errors.append({"row": index, "email": email, "error": str(e)})
            skipped += 1
            continue

        if course and not Enrollment.objects.filter(student=student, course=course).exists():
            Enrollment.objects.create(
                student    = student,
                course     = course,
                status     = student.status,
                start_date = (
                    student.admission_date.date()
                    if student.admission_date
                    else timezone.now().date()
                ),
                fee_amount = student.total_fees,
            )

        if was_created:
            created += 1
        else:
            updated += 1

    return {"created": created, "updated": updated, "skipped": skipped, "errors": errors}


# ─────────────────────────────────────────────────────────────────────────────
# 2.  DETAILS SHEET SYNC  (staff sheet — roll_no, session, fees, status)
# ─────────────────────────────────────────────────────────────────────────────

def sync_from_details_sheet():
    """
    Staff ki Admission Details Google Sheet → DB sync.

    Student Details tab ke columns:
    Sr. No. | Name | Roll No. | Course | Gender | Session | Father's Name |
    Mother's Name | Qualification | Student Image | Date of Birth |
    Full Address | Phone No. | Email | Date OF Joining | Total Fees | Status
    """

    # ──────────────────────────────────────────────────────────────────────────
    # STEP 1: Google Sheet se saara data fetch karo
    # ──────────────────────────────────────────────────────────────────────────
    sheet      = get_details_sheet()
    all_values = sheet.get_all_values()  # 2D list — [[row1_col1, row1_col2...], [row2...], ...]

    # Header row dhundo (jis row mein "Roll No" ya "Sr. No" ho)
    # Ye zaruri hai kyunki sheet ke upar extra rows ho sakti hain (title, blank, etc.)
    header_row_idx = None
    for i, row in enumerate(all_values):
        if any("Roll No" in str(cell) or "Sr. No" in str(cell) for cell in row):
            header_row_idx = i
            break

    if header_row_idx is None:
        raise ValueError("Header row nahi mili 'Student Details' sheet mein")

    # Headers ki list banao (index-wise), aur actual data rows alag karo
    headers   = [str(h).strip() for h in all_values[header_row_idx]]
    data_rows = all_values[header_row_idx + 1:]  # Header ke neeche ki saari rows

    # ──────────────────────────────────────────────────────────────────────────
    # STEP 2: Counters initialize karo — sync result ke liye
    # ──────────────────────────────────────────────────────────────────────────
    created = 0   # Naye students jo DB mein add hue
    updated = 0   # Existing enrollments jo update hue / naye enrollments bane
    skipped = 0   # Rows jo process nahi hui (blank / koi match nahi / koi change nahi)
    errors  = []  # Rows jo exception ki wajah se fail huin

    # ──────────────────────────────────────────────────────────────────────────
    # STEP 3: Har data row process karo
    # ──────────────────────────────────────────────────────────────────────────
    for row_values in data_rows:

        # Row ko dict mein convert karo: {"Sr. No.": "1", "Name": "Amit", ...}
        # Agar row mein headers se kam columns hain toh empty string daal do
        row = {headers[i]: (row_values[i] if i < len(row_values) else "") for i in range(len(headers))}

        # Blank row check — "Sr. No." empty hai toh ye row skip karo
        if not clean(row.get("Sr. No.")):
            continue

        # Row se key fields nikalo
        name    = clean(row.get("Name"))
        email   = clean(row.get("Email"))
        phone   = clean(row.get("Phone No."))
        roll_no = clean(row.get("Roll No."))

        # ══════════════════════════════════════════════════════════════════════
        # STEP 4: Existing student dhundo — 4 levels mein (priority order)
        # Goal: sheet ki row ko DB ke student se match karo
        # ══════════════════════════════════════════════════════════════════════
        student = None

        # Level 1 — Email se match (sabse reliable, unique hoti hai)
        if email:
            student = Student.objects.filter(email__iexact=email).first()

        # Level 2 — Phone ke last 8 digits se match
        # (same person different formatting: +91-98765-43210 vs 9876543210)
        if not student and phone:
            digits = ''.join(c for c in phone if c.isdigit())
            if len(digits) >= 8:
                student = Student.objects.filter(phone__endswith=digits[-8:]).first()

        # Level 3 — First name + DOB + Father's Name teeno saath match karo
        # Sirf tab use karo jab email aur phone dono nahi mile
        # Teeno fields mandatory hain — akele naam kaafi nahi (common names hote hain)
        if not student and name:
            dob_val = parse_date(clean(row.get("Date of Birth")))
            father  = clean(row.get("Father's Name"))
            if dob_val and father:
                first_name = name.strip().split()[0].lower()
                for s in Student.objects.filter(
                    dob=dob_val,
                    father_name__iexact=father.strip()
                ):
                    if s.name.strip().split()[0].lower() == first_name:
                        student = s
                        break

        # Level 4 — Roll No. se match (enrollment mein already assigned ho)
        # Last resort — sirf tab jab baaki teen levels fail ho jaayein
        if not student and roll_no:
            enr = Enrollment.objects.filter(roll_no=roll_no).first()
            if enr:
                student = enr.student

        # ══════════════════════════════════════════════════════════════════════
        # STEP 5: Agar student DB mein nahi mila — naya student banao
        # ══════════════════════════════════════════════════════════════════════
        if not student:

            # Name bhi nahi hai toh kuch nahi kar sakte — skip
            if not name:
                skipped += 1
                continue

            course = resolve_course(clean(row.get("Course")))

            try:
                # Email nahi hai toh placeholder email banao
                # (DB mein email unique field hai, toh kuch toh chahiye)
                digits     = ''.join(filter(str.isdigit, phone)) if phone else ""
                unique_key = roll_no or (digits[-8:] if len(digits) >= 8 else name.replace(' ', '_').lower())
                safe_email = email or f"noemail_{unique_key}@placeholder.com"

                # get_or_create: agar safe_email se student mila toh wahi lo,
                # nahi mila toh defaults se naya banao
                student, was_created_now = Student.objects.get_or_create(
                    email=safe_email,
                    defaults={
                        "name"          : name,
                        "phone"         : phone,
                        "father_name"   : clean(row.get("Father's Name")),
                        "mother_name"   : clean(row.get("Mother's Name")),
                        "gender"        : clean(row.get("Gender")),
                        "qualification" : clean(row.get("Qualification")),
                        "address"       : clean(row.get("Full Address")),
                        "photo_url"     : clean(row.get("Student Image")),
                        "dob"           : parse_date(clean(row.get("Date of Birth"))),
                        "course"        : course,
                        "status"        : _map_status(clean(row.get("Status"))) or "active",
                        "synced_at"     : timezone.now(),
                    },
                )

                if was_created_now:
                    created += 1  # Bilkul naya student bana
                else:
                    # Student mila placeholder email se — missing fields fill karo
                    _merge_student_fields(student, row)

            except Exception as e:
                errors.append({"name": name, "roll_no": roll_no, "error": str(e)})
                skipped += 1
                continue

        else:
            # ──────────────────────────────────────────────────────────────────
            # STEP 5b: Student mila — sirf blank fields fill karo
            # Existing data kabhi overwrite nahi hoga (merge strategy)
            # ──────────────────────────────────────────────────────────────────
            _merge_student_fields(student, row)

        # ══════════════════════════════════════════════════════════════════════
        # STEP 6: Course resolve karo aur Enrollment dhundo / banao
        # ══════════════════════════════════════════════════════════════════════

        # Sheet ka course → DB Course object
        # Fallback: agar sheet mein course nahi toh student ka existing course use karo
        course       = resolve_course(clean(row.get("Course"))) or student.course
        joining_date = parse_date(clean(row.get("Date OF Joining") or row.get("Date of Joining")))
        total_fees   = _parse_number(row.get("Total Fees"))
        status_raw   = clean(row.get("Status"))
        session_raw  = clean(row.get("Session"))

        # ── Enrollment dhundo ─────────────────────────────────────────────────

        enrollment = None

        # Priority 1: student + course dono match karo (exact enrollment)
        if course:
            enrollment = Enrollment.objects.filter(student=student, course=course).first()

        # Priority 2 (DANGER ZONE): Agar course match nahi aur student ki sirf
        # 1 enrollment hai toh wahi le lo
        # ⚠️ PROBLEM: Multi-course students ke liye ye galat enrollment update kar sakta hai!
        # Example: Amit ke paas DCA enrollment hai, Programming Language row aaya,
        #          course resolve nahi hua → ye DCA enrollment ko update karega ❌
        if not enrollment:
            all_enr = Enrollment.objects.filter(student=student)
            if all_enr.count() == 1:
                enrollment = all_enr.first()

        # ══════════════════════════════════════════════════════════════════════
        # STEP 7: Enrollment mili — update karo (sirf blank fields)
        # ══════════════════════════════════════════════════════════════════════
        if enrollment:
            enroll_changed = False

            # Roll No. assign karo — par pehle check karo kisi aur ki toh nahi
            if roll_no and enrollment.roll_no != roll_no:
                roll_no_taken = Enrollment.objects.filter(
                    roll_no=roll_no
                ).exclude(pk=enrollment.pk).exists()
                if not roll_no_taken:
                    enrollment.roll_no = roll_no
                    enroll_changed = True

            # Start date sirf tab set karo jab abhi blank ho
            if joining_date and not enrollment.start_date:
                enrollment.start_date = joining_date
                enroll_changed = True

            # Fee amount sirf tab set karo jab abhi blank ho
            if total_fees and not enrollment.fee_amount:
                enrollment.fee_amount = total_fees
                enroll_changed = True

            # Session (batch number) sirf tab set karo jab abhi blank ho
            if session_raw and not enrollment.session:
                parsed_session = _parse_session(session_raw)
                if parsed_session:
                    enrollment.session = parsed_session
                    enroll_changed = True

            # Status update karo agar sheet mein valid status hai aur alag hai
            if status_raw:
                mapped_status = _map_status(status_raw)
                if mapped_status and enrollment.status != mapped_status:
                    enrollment.status = mapped_status
                    enroll_changed = True

            if enroll_changed:
                enrollment.save()
                updated += 1
            else:
                skipped += 1  # Enrollment mili par kuch change nahi tha

        # ══════════════════════════════════════════════════════════════════════
        # STEP 8: Enrollment nahi mili — naya enrollment banao
        # ══════════════════════════════════════════════════════════════════════
        else:
            if course:
                # Roll No. duplicate nahi hona chahiye — check karo
                safe_roll_no = None
                if roll_no and not Enrollment.objects.filter(roll_no=roll_no).exists():
                    safe_roll_no = roll_no

                Enrollment.objects.create(
                    student    = student,
                    course     = course,
                    roll_no    = safe_roll_no,
                    status     = _map_status(status_raw) or "active",
                    start_date = joining_date or timezone.now().date(),
                    fee_amount = total_fees,
                    session    = _parse_session(session_raw),
                )
                updated += 1
            else:
                # Course bhi nahi mila — kuch nahi kar sakte, skip
                skipped += 1

    return {"created": created, "updated": updated, "skipped": skipped, "errors": errors}