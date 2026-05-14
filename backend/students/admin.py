from django.contrib import admin
from .models import Course, Student, Enrollment, CourseAlias


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display  = ["name", "phone", "email", "course", "status", "admission_date"]
    list_filter   = ["status", "course", "gender"]
    search_fields = ["name", "phone", "email", "aadhaar_number"]


class CourseAliasInline(admin.TabularInline):
    model  = CourseAlias
    extra  = 1
    fields = ["alias"]


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display  = ["name", "short_name", "duration_months",
                     "total_fee", "offer_fee", "fee_type", "is_active"]
    list_editable = ["is_active", "offer_fee"]
    list_filter   = ["fee_type", "is_active"]
    search_fields = ["name", "short_name"]
    inlines       = [CourseAliasInline]     # ← Course page pe directly aliases manage karo


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display  = ["student", "course", "roll_no", "session",
                     "status", "start_date", "end_date", "fee_amount"]
    list_filter   = ["status", "course"]
    search_fields = ["student__name", "roll_no"]
    list_editable = ["status"]


@admin.register(CourseAlias)
class CourseAliasAdmin(admin.ModelAdmin):
    list_display  = ["alias", "course"]
    list_filter   = ["course"]
    search_fields = ["alias", "course__name"]
    ordering      = ["alias"]