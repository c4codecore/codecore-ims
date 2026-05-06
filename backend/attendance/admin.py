from django.contrib import admin
from .models import Attendance

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display  = ["student", "date", "status", "note"]
    list_filter   = ["status", "date"]
    search_fields = ["student__name"]
    list_editable = ["status"]