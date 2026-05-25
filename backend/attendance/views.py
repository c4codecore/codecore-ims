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
    date = request.query_params.get("date")
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
    active_ids = set(active_students.values_list("id", flat=True))

    records = request.data.get("records", [])
    date = request.data.get("date")
    created = 0
    updated = 0

    for record in records:
        if record["student"] not in active_ids:
            continue

        _, was_created = Attendance.objects.update_or_create(
            student_id=record["student"],
            date=date,
            defaults={
                "status": record.get("status", "absent"),
                "note": record.get("note", ""),
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
    student_id = request.query_params.get("student")

    if not student_id:
        return Response({"error": "student id required"}, status=400)

    total = Attendance.objects.filter(student_id=student_id).count()
    present = Attendance.objects.filter(student_id=student_id, status="present").count()
    absent = Attendance.objects.filter(student_id=student_id, status="absent").count()
    leave = Attendance.objects.filter(student_id=student_id, status="leave").count()

    percentage = round((present / total * 100), 2) if total > 0 else 0

    return Response({
        "total": total,
        "present": present,
        "absent": absent,
        "leave": leave,
        "percentage": percentage,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_monthly_report(request):
    month_param = request.query_params.get("month")

    if month_param:
        year, month = map(int, month_param.split("-"))
    else:
        today = timezone.localdate()
        year, month = today.year, today.month

    start_date = date_type(year, month, 1)
    end_date = date_type(year, month, monthrange(year, month)[1])

    active_students = Student.objects.filter(status="active").select_related("course").order_by("name")
    attendance_qs = Attendance.objects.filter(
        date__year=year,
        date__month=month,
        student__status="active",
    ).select_related("student", "student__course")

    student_map = {
        student.id: {
            "student_id": student.id,
            "student_name": student.name,
            "course_name": student.course.name if student.course else "-",
            "present": 0,
            "absent": 0,
            "leave": 0,
            "total": 0,
            "percentage": 0,
            "consecutive_absent": 0,
        }
        for student in active_students
    }

    by_student_records = {}
    for record in attendance_qs.order_by("student_id", "-date"):
        sid = record.student_id
        if sid not in student_map:
            continue
        student_map[sid][record.status] += 1
        by_student_records.setdefault(sid, []).append(record)

    students = []
    for student in student_map.values():
        total = student["present"] + student["absent"] + student["leave"]
        student["total"] = total
        student["percentage"] = round((student["present"] / total * 100), 1) if total else 0

        for record in by_student_records.get(student["student_id"], []):
            if record.status == "absent":
                student["consecutive_absent"] += 1
            else:
                break

        students.append(student)

    daily_trend = Attendance.objects.filter(
        date__year=year,
        date__month=month,
        student__status="active",
    ).values("date").annotate(
        present=Count("id", filter=Q(status="present")),
        absent=Count("id", filter=Q(status="absent")),
        leave=Count("id", filter=Q(status="leave")),
    ).order_by("date")

    course_map = {}
    for student in students:
        course_name = student["course_name"]
        course = course_map.setdefault(course_name, {
            "course_name": course_name,
            "students": 0,
            "present": 0,
            "absent": 0,
            "leave": 0,
            "total": 0,
            "percentage": 0,
        })
        course["students"] += 1
        course["present"] += student["present"]
        course["absent"] += student["absent"]
        course["leave"] += student["leave"]
        course["total"] += student["total"]

    for course in course_map.values():
        course["percentage"] = round((course["present"] / course["total"] * 100), 1) if course["total"] else 0

    total_present = sum(student["present"] for student in students)
    total_absent = sum(student["absent"] for student in students)
    total_leave = sum(student["leave"] for student in students)
    total_marked = total_present + total_absent + total_leave
    low_attendance = [
        student for student in students
        if student["total"] > 0 and student["percentage"] < 75
    ]
    no_attendance = [student for student in students if student["total"] == 0]

    today = timezone.localdate()
    absent_today = []
    if start_date <= today <= end_date:
        absent_today = list(
            Attendance.objects.filter(
                date=today,
                status="absent",
                student__status="active",
            ).select_related("student", "student__course").values(
                "student_id",
                "student__name",
                "student__course__name",
            ).order_by("student__name")
        )

    return Response({
        "month": f"{year}-{str(month).zfill(2)}",
        "summary": {
            "active_students": active_students.count(),
            "students_marked": len([student for student in students if student["total"] > 0]),
            "students_not_marked": len(no_attendance),
            "present": total_present,
            "absent": total_absent,
            "leave": total_leave,
            "total": total_marked,
            "percentage": round((total_present / total_marked * 100), 1) if total_marked else 0,
            "low_attendance_count": len(low_attendance),
        },
        "students": students,
        "daily_trend": list(daily_trend),
        "course_summary": sorted(course_map.values(), key=lambda course: course["course_name"]),
        "low_attendance": sorted(low_attendance, key=lambda student: student["percentage"]),
        "no_attendance": no_attendance,
        "absent_today": absent_today,
    })
