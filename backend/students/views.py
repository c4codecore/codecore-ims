from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .sheet_sync import sync_students_from_sheet
from .models import Student, Course, Enrollment
from .serializers import StudentSerializer, CourseSerializer, EnrollmentSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def sync_from_sheet(request):
    """Admin button dabayega toh sheet se sync hoga"""
    try:
        result = sync_students_from_sheet()
        return Response(
            {
                "message": "Sync successful",
                "created": result["created"],
                "updated": result["updated"],  # ← skipped ki jagah updated
                "skipped": result["skipped"],
            }
        )
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_list(request):
    status = request.query_params.get("status")
    students = Student.objects.all().order_by("name")
    
    if status:
        students = students.filter(status=status)
    
    serializer = StudentSerializer(students, many=True)
    return Response(serializer.data)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def student_detail(request, pk):
    try:
        student = Student.objects.get(pk=pk)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)

    if request.method == "GET":
        serializer = StudentSerializer(student)
        return Response(serializer.data)

    elif request.method == "PATCH":
        serializer = StudentSerializer(student, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    from .models import Student, Course
    
    total_students = Student.objects.filter(status="active").count()
    total_courses  = Course.objects.count()
    
    return Response({
        "total_students": total_students,
        "total_courses" : total_courses,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def course_list(request):
    """List all courses ordered by name"""
    courses    = Course.objects.all().order_by("name")
    serializer = CourseSerializer(courses, many=True)
    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def course_update(request, pk):
    """Partial update a course (fees, duration, fee_type, is_active)"""
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
def enrollment_list_create(request, pk):
    """GET: list student enrollments. POST: create new enrollment."""
    try:
        student = Student.objects.get(pk=pk)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)

    if request.method == "GET":
        enrollments = Enrollment.objects.filter(student=student).select_related("course")
        serializer  = EnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)

    # POST — create enrollment
    data = {**request.data, "student": student.id}
    serializer = EnrollmentSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def enrollment_update(request, pk):
    """PATCH: partial update enrollment (status, end_date, note, fee_amount)."""
    try:
        enrollment = Enrollment.objects.get(pk=pk)
    except Enrollment.DoesNotExist:
        return Response({"error": "Enrollment not found"}, status=404)

    serializer = EnrollmentSerializer(enrollment, data=request.data, partial=True)
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
        from .models import Enrollment
        from .serializers import EnrollmentSerializer
        enrollments = Enrollment.objects.filter(student=student).select_related("course")
        return Response(EnrollmentSerializer(enrollments, many=True).data)

    elif request.method == "POST":
        from .serializers import EnrollmentSerializer
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
    from .models import Enrollment
    from .serializers import EnrollmentSerializer
    try:
        enrollment = Enrollment.objects.get(pk=pk)
    except Enrollment.DoesNotExist:
        return Response({"error": "Enrollment not found"}, status=404)

    serializer = EnrollmentSerializer(enrollment, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)