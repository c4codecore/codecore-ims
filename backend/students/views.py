from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .sheet_sync import sync_students_from_sheet, sync_from_details_sheet
from .models import Student, Course, Enrollment
from .serializers import StudentSerializer, CourseSerializer, EnrollmentSerializer
import requests
from django.http import HttpResponse


@api_view(["POST"])
@permission_classes([AllowAny])
def sync_from_sheet(request):
    """Google Form responses sheet se students sync karo"""
    try:
        result = sync_students_from_sheet()
        return Response({
            "message" : "Sync successful",
            "created" : result["created"],
            "updated" : result["updated"],
            "skipped" : result["skipped"],
            "errors"  : result.get("errors", []),
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_details(request):
    """
    Staff wali Admission Details Google Sheet se sync karo.
    Roll No, Session, Date of Joining, Total Fees, Status → Enrollment update.
    Naye students bhi create hote hain agar form mein nahi the.
    """
    try:
        result = sync_from_details_sheet()
        return Response({
            "message" : "Details sync successful",
            "created" : result["created"],
            "updated" : result["updated"],
            "skipped" : result["skipped"],
            "errors"  : result.get("errors", []),
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_all(request):
    """Run form sheet sync followed by admission details sync and return combined results."""
    try:
        form_res = sync_students_from_sheet()
        details_res = sync_from_details_sheet()
        return Response({
            "form_sheet": {
                "created": form_res.get("created", 0),
                "updated": form_res.get("updated", 0),
                "skipped": form_res.get("skipped", 0),
                "errors": form_res.get("errors", []),
            },
            "details_sheet": {
                "created": details_res.get("created", 0),
                "updated": details_res.get("updated", 0),
                "skipped": details_res.get("skipped", 0),
                "errors": details_res.get("errors", []),
            }
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_list(request):
    status = request.query_params.get("status")
    students = Student.objects.all().order_by("name")
    if status:
        students = students.filter(status=status)
    return Response(StudentSerializer(students, many=True).data)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def student_detail(request, pk):
    try:
        student = Student.objects.get(pk=pk)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)

    if request.method == "GET":
        return Response(StudentSerializer(student).data)

    serializer = StudentSerializer(student, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    return Response({
        "total_students": Student.objects.filter(status="active").count(),
        "total_courses"  : Course.objects.count(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def course_list(request):
    courses = Course.objects.all().order_by("name")
    return Response(CourseSerializer(courses, many=True).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def course_update(request, pk):
    try:
        course = Course.objects.get(pk=pk)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)

    serializer = CourseSerializer(course, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def student_enrollments(request, pk):
    try:
        student = Student.objects.get(pk=pk)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)

    if request.method == "GET":
        enrollments = Enrollment.objects.filter(student=student).select_related("course")
        return Response(EnrollmentSerializer(enrollments, many=True).data)

    data = request.data.copy()
    data["student"] = pk
    serializer = EnrollmentSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def enrollment_update(request, pk):
    try:
        enrollment = Enrollment.objects.get(pk=pk)
    except Enrollment.DoesNotExist:
        return Response({"error": "Enrollment not found"}, status=404)

    serializer = EnrollmentSerializer(enrollment, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


def proxy_drive_image(request):
    file_id = request.GET.get("id")
    url  = f"https://drive.google.com/thumbnail?id={file_id}&sz=w400"
    resp = requests.get(url)
    return HttpResponse(resp.content, content_type=resp.headers["Content-Type"])