from rest_framework import serializers
from .models import Student, Course, Enrollment

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Course
        fields = "__all__"

class EnrollmentSerializer(serializers.ModelSerializer):
    course_name       = serializers.CharField(source="course.name",       read_only=True)
    course_short_name = serializers.CharField(source="course.short_name", read_only=True)

    class Meta:
        model  = Enrollment
        fields = [
            "id", "student", "course", "course_name", "course_short_name",
            "status", "start_date", "end_date", "fee_amount", "note", "created_at",
        ]

class StudentSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model  = Student
        fields = "__all__"