from django.contrib import admin
from .models import Course, Student, Enrollment


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display  = ["name", "phone", "email", "course", "status", "admission_date"]
    list_filter   = ["status", "course", "gender"]
    search_fields = ["name", "phone", "email", "aadhaar_number"]


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display  = ["name", "short_name", "duration_months", 
                     "total_fee", "offer_fee", "fee_type", "is_active"]
    list_editable = ["is_active", "offer_fee"]  # direct list se edit
    list_filter   = ["fee_type", "is_active"]
    search_fields = ["name", "short_name"]

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display  = ["student", "course", "status", "start_date", "end_date", "fee_amount"]
    list_filter   = ["status", "course"]
    search_fields = ["student__name"]
    list_editable = ["status"]