from django.contrib import admin
from .models import FeeStructure, FeePayment

class FeePaymentInline(admin.TabularInline):
    model  = FeePayment
    extra  = 1
    fields = ["amount", "payment_date", "payment_mode", "receipt_no"]

@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display  = ["enrollment", "total_fee", "discount", "final_fee", "total_paid_display", "balance_display"]
    search_fields = ["enrollment__student__name"]
    inlines       = [FeePaymentInline]

    def total_paid_display(self, obj):
        return f"₹{obj.total_paid}"
    total_paid_display.short_description = "Paid"

    def balance_display(self, obj):
        return f"₹{obj.balance}"
    balance_display.short_description = "Balance"

@admin.register(FeePayment)
class FeePaymentAdmin(admin.ModelAdmin):
    list_display  = ["fee_structure", "amount", "payment_date", "payment_mode", "receipt_no"]
    list_filter   = ["payment_mode", "payment_date"]
    search_fields = ["fee_structure__enrollment__student__name", "receipt_no"]