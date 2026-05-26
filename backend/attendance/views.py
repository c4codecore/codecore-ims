from calendar import monthrange
from datetime import date as date_type

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from students.models import Student
from .models import Attendance
from .serializers import AttendanceSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_list(request):
    date       = request.query_params.get("date")
    student_id = request.query_params.get("student")

    attendance = Attendance.objects.select_related("student", "student__course").all()

    if date:
        attendance = attendance.filter(date=date)
    if student_id:
        attendance = attendance.filter(student_id=student_id)

    serializer = AttendanceSerializer(attendance, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def attendance_mark(request):
    active_students = Student.objects.filter(status="active")
    active_ids      = set(active_students.values_list("id", flat=True))

    records = request.data.get("records", [])
    date    = request.data.get("date")
    created = 0
    updated = 0

    for record in records:
        try:
            student_id = int(record["student"])
        except (KeyError, TypeError, ValueError):
            continue

        if student_id not in active_ids:
            continue

        _, was_created = Attendance.objects.update_or_create(
            student_id=student_id,
            date=date,
            defaults={
                "status": record.get("status", "absent"),
                "note"  : record.get("note", ""),
            },
        )
        if was_created:
            created += 1
        else:
            updated += 1

    return Response({
        "message": "Attendance saved",
        "created": created,
        "updated": updated,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_summary(request):
    """
    Holiday wale din total mein count NAHI hote —
    percentage = present / (present + absent + leave) only.
    """
    student_id  = request.query_params.get("student")
    month_param = request.query_params.get("month")
    year_param  = request.query_params.get("year")

    if not student_id:
        return Response({"error": "student id required"}, status=400)

    qs = Attendance.objects.filter(student_id=student_id)

    if month_param:
        try:
            year, month = map(int, month_param.split("-"))
            qs = qs.filter(date__year=year, date__month=month)
        except ValueError:
            return Response({"error": "month format must be YYYY-MM"}, status=400)
    elif year_param:
        try:
            qs = qs.filter(date__year=int(year_param))
        except ValueError:
            return Response({"error": "year must be a number"}, status=400)

    total   = qs.count()
    present = qs.filter(status="present").count()
    absent  = qs.filter(status="absent").count()
    leave   = qs.filter(status="leave").count()
    holiday = qs.filter(status="holiday").count()

    # Holiday din count mein nahi — sirf present/absent/leave
    countable = present + absent + leave
    percentage = round((present / countable * 100), 2) if countable > 0 else 0

    return Response({
        "total"     : total,
        "present"   : present,
        "absent"    : absent,
        "leave"     : leave,
        "holiday"   : holiday,
        "percentage": percentage,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_monthly_report(request):
    """
    Holiday wale din:
      - student ka total/percentage calculation mein count NAHI hote
      - daily_trend mein alag "holiday" key aata hai
      - course summary mein bhi exclude
    """
    month_param = request.query_params.get("month")

    if month_param:
        try:
            year, month = map(int, month_param.split("-"))
        except ValueError:
            return Response({"error": "month format must be YYYY-MM"}, status=400)
    else:
        today       = timezone.localdate()
        year, month = today.year, today.month

    start_date = date_type(year, month, 1)
    end_date   = date_type(year, month, monthrange(year, month)[1])

    active_students = (
        Student.objects
        .filter(status="active")
        .select_related("course")
        .order_by("name")
    )

    attendance_qs = (
        Attendance.objects
        .filter(
            date__year=year,
            date__month=month,
            student__status="active",
        )
        .select_related("student", "student__course")
        .order_by("student_id", "-date")
    )

    student_map = {
        student.id: {
            "student_id"         : student.id,
            "student_name"       : student.name,
            "course_name"        : student.course.name if student.course else "-",
            "present"            : 0,
            "absent"             : 0,
            "leave"              : 0,
            "holiday"            : 0,
            "total"              : 0,
            "percentage"         : 0,
            "consecutive_absent" : 0,
        }
        for student in active_students
    }

    by_student_records: dict[int, list] = {}
    for record in attendance_qs:
        sid = record.student_id
        if sid not in student_map:
            continue
        student_map[sid][record.status] += 1
        by_student_records.setdefault(sid, []).append(record)

    students = []
    for student in student_map.values():
        # Holiday exclude — sirf present/absent/leave count hote hain
        countable = student["present"] + student["absent"] + student["leave"]
        student["total"]      = countable
        student["percentage"] = (
            round((student["present"] / countable * 100), 1) if countable else 0
        )

        # Consecutive absent streak (holiday breaks streak nahi karta — skip karo)
        streak = 0
        for record in by_student_records.get(student["student_id"], []):
            if record.status == "holiday":
                continue          # holiday skip — streak pe asar nahi
            if record.status == "absent":
                streak += 1
            else:
                break
        student["consecutive_absent"] = streak

        students.append(student)

    # Daily trend — holiday bhi include
    daily_trend = (
        Attendance.objects
        .filter(
            date__year=year,
            date__month=month,
            student__status="active",
        )
        .values("date")
        .annotate(
            present=Count("id", filter=Q(status="present")),
            absent =Count("id", filter=Q(status="absent")),
            leave  =Count("id", filter=Q(status="leave")),
            holiday=Count("id", filter=Q(status="holiday")),
        )
        .order_by("date")
    )

    # Course summary — holiday exclude from percentage
    course_map: dict[str, dict] = {}
    for student in students:
        course_name = student["course_name"]
        course      = course_map.setdefault(course_name, {
            "course_name": course_name,
            "students"   : 0,
            "present"    : 0,
            "absent"     : 0,
            "leave"      : 0,
            "holiday"    : 0,
            "total"      : 0,
            "percentage" : 0,
        })
        course["students"] += 1
        course["present"]  += student["present"]
        course["absent"]   += student["absent"]
        course["leave"]    += student["leave"]
        course["holiday"]  += student["holiday"]
        course["total"]    += student["total"]   # already holiday-excluded

    for course in course_map.values():
        course["percentage"] = (
            round((course["present"] / course["total"] * 100), 1)
            if course["total"] else 0
        )

    total_present = sum(s["present"] for s in students)
    total_absent  = sum(s["absent"]  for s in students)
    total_leave   = sum(s["leave"]   for s in students)
    total_holiday = sum(s["holiday"] for s in students)
    total_marked  = total_present + total_absent + total_leave  # holiday excluded

    low_attendance = [s for s in students if s["total"] > 0 and s["percentage"] < 75]
    no_attendance  = [s for s in students if s["total"] == 0]

    today        = timezone.localdate()
    absent_today = []
    if start_date <= today <= end_date:
        absent_today = list(
            Attendance.objects
            .filter(date=today, status="absent", student__status="active")
            .select_related("student", "student__course")
            .values("student_id", "student__name", "student__course__name")
            .order_by("student__name")
        )

    return Response({
        "month"   : f"{year}-{str(month).zfill(2)}",
        "summary" : {
            "active_students"      : active_students.count(),
            "students_marked"      : len([s for s in students if s["total"] > 0]),
            "students_not_marked"  : len(no_attendance),
            "present"              : total_present,
            "absent"               : total_absent,
            "leave"                : total_leave,
            "holiday"              : total_holiday,
            "total"                : total_marked,
            "percentage"           : round((total_present / total_marked * 100), 1) if total_marked else 0,
            "low_attendance_count" : len(low_attendance),
        },
        "students"       : students,
        "daily_trend"    : list(daily_trend),
        "course_summary" : sorted(course_map.values(), key=lambda c: c["course_name"]),
        "low_attendance" : sorted(low_attendance, key=lambda s: s["percentage"]),
        "no_attendance"  : no_attendance,
        "absent_today"   : absent_today,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_calendar(request):
    """
    Holiday bhi records mein aata hai — frontend calendar mein
    grey cell dikhega aur percentage mein count nahi hoga.
    """
    student_id = request.query_params.get("student")
    if not student_id:
        return Response({"error": "student id required"}, status=400)

    year_param = request.query_params.get("year")
    year       = int(year_param) if year_param else date_type.today().year

    qs = (
        Attendance.objects
        .filter(student_id=student_id, date__year=year)
        .values("date", "status")
        .order_by("date")
    )

    records = {str(row["date"]): row["status"] for row in qs}

    return Response({
        "student_id": int(student_id),
        "year"      : year,
        "records"   : records,
    })