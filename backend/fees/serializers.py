from rest_framework import serializers
from .models import FeeStructure, FeePayment

class FeePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FeePayment
        fields = [
            "id", "fee_structure", "amount", "payment_date",
            "payment_mode", "receipt_no", "note", "created_at"
        ]
        read_only_fields = ["receipt_no", "created_at"]


class FeeStructureSerializer(serializers.ModelSerializer):
    # Read-only display fields
    student_name  = serializers.CharField(source="enrollment.student.name",  read_only=True)
    course_name   = serializers.CharField(source="enrollment.course.name",   read_only=True)
    roll_no       = serializers.CharField(source="enrollment.roll_no",       read_only=True)
    total_paid    = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    balance       = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    payments      = FeePaymentSerializer(many=True, read_only=True)

    class Meta:
        model  = FeeStructure
        fields = [
            "id", "enrollment",
            "student_name", "course_name", "roll_no",
            "total_fee", "discount", "final_fee",
            "total_paid", "balance",
            "note", "created_at",
            "payments",
        ]
        read_only_fields = ["final_fee", "created_at"]