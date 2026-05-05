from django.contrib import admin
from .models import Course, Student

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["name", "duration_months", "total_fee", "fee_type"]

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display  = ["name", "phone", "email", "course", "status", "join_date"]
    list_filter   = ["status", "course", "gender"]
    search_fields = ["name", "phone", "email", "aadhaar_number"]