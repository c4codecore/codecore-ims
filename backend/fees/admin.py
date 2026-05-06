from django.contrib import admin
from .models import Fee

@admin.register(Fee)
class FeeAdmin(admin.ModelAdmin):
    list_display  = ["student", "amount", "month", "status", "paid_at"]
    list_filter   = ["status", "month"]
    search_fields = ["student__name", "student__phone"]
    list_editable = ["status"]
