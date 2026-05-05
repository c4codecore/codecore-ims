from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .sheet_sync import sync_students_from_sheet
from .models import Student
from .serializers import StudentSerializer

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_from_sheet(request):
    """Admin button dabayega toh sheet se sync hoga"""
    try:
        result = sync_students_from_sheet()
        return Response({
            "message": "Sync successful",
            "created": result["created"],
            "skipped": result["skipped"],
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_list(request):
    students = Student.objects.all().order_by("-join_date")
    serializer = StudentSerializer(students, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_detail(request, pk):
    try:
        student = Student.objects.get(pk=pk)
        serializer = StudentSerializer(student)
        return Response(serializer.data)
    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)