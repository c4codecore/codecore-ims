from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from .models import Attendance
from .serializers import AttendanceSerializer
from students.models import Student

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
    # Sirf active students fetch karo
    active_students = Student.objects.filter(status="active")
    
    records = request.data.get("records", [])
    date    = request.data.get("date")
    
    # Validate — sirf active students ki attendance accept karo
    active_ids = set(active_students.values_list("id", flat=True))
    
    created = 0
    updated = 0

    for record in records:
        if record["student"] not in active_ids:
            continue  # inactive student skip karo
            
        attendance, was_created = Attendance.objects.update_or_create(
            student_id = record["student"],
            date       = date,
            defaults   = {
                "status": record.get("status", "absent"),
                "note"  : record.get("note", ""),
            }
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
    """Student ki overall attendance summary"""
    student_id = request.query_params.get("student")

    if not student_id:
        return Response({"error": "student id required"}, status=400)

    total   = Attendance.objects.filter(student_id=student_id).count()
    present = Attendance.objects.filter(student_id=student_id, status="present").count()
    absent  = Attendance.objects.filter(student_id=student_id, status="absent").count()
    leave   = Attendance.objects.filter(student_id=student_id, status="leave").count()

    percentage = round((present / total * 100), 2) if total > 0 else 0

    return Response({
        "total"     : total,
        "present"   : present,
        "absent"    : absent,
        "leave"     : leave,
        "percentage": percentage,
    })


from django.db.models import Count, Q
from datetime import date as date_type

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_monthly_report(request):
    """
    Ek hi call mein sab students ki monthly attendance summary
    ?month=2026-05  (default: current month)
    """
    month_param = request.query_params.get("month")  # "2026-05"
    
    if month_param:
        year, month = map(int, month_param.split("-"))
    else:
        today = date_type.today()
        year, month = today.year, today.month

    qs = Attendance.objects.filter(
        date__year=year,
        date__month=month,
        student__status="active"
    ).select_related("student", "student__course")

    # Student-wise aggregate
    from collections import defaultdict
    student_map = {}
    
    for record in qs:
        sid = record.student.id
        if sid not in student_map:
            student_map[sid] = {
                "student_id": sid,
                "student_name": record.student.name,
                "course_name": record.student.course.name if record.student.course else "—",
                "present": 0, "absent": 0, "leave": 0,
            }
        student_map[sid][record.status] += 1

    # Percentage calculate karo
    result = []
    for s in student_map.values():
        total = s["present"] + s["absent"] + s["leave"]
        s["total"] = total
        s["percentage"] = round((s["present"] / total * 100), 1) if total > 0 else 0
        result.append(s)

    # Daily trend — last 30 days of this month
    daily = Attendance.objects.filter(
        date__year=year,
        date__month=month,
    ).values("date").annotate(
        present=Count("id", filter=Q(status="present")),
        absent=Count("id", filter=Q(status="absent")),
        leave=Count("id", filter=Q(status="leave")),
    ).order_by("date")

    return Response({
        "month": f"{year}-{str(month).zfill(2)}",
        "students": result,
        "daily_trend": list(daily),
    })