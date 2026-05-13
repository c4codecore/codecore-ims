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
    student_name  = serializers.CharField(source="enrollment.student.name",        read_only=True)
    course_name   = serializers.CharField(source="enrollment.course.name",         read_only=True)
    roll_no       = serializers.CharField(source="enrollment.roll_no",             read_only=True)
    father_name   = serializers.CharField(source="enrollment.student.father_name", read_only=True)
    student_phone = serializers.CharField(source="enrollment.student.phone",       read_only=True)
    joining_date  = serializers.DateField(source="enrollment.start_date",          read_only=True)
    total_paid    = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    balance       = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    payments      = FeePaymentSerializer(many=True, read_only=True)
    student_photo_url = serializers.CharField(source="enrollment.student.photo_url", read_only=True)
    student_email     = serializers.EmailField(source="enrollment.student.email",     read_only=True)

    class Meta:
        model  = FeeStructure
        fields = [
            "id", "enrollment",
            "student_name", "course_name", "roll_no",
            "father_name", "student_phone", "student_email", "joining_date",
            "total_fee", "discount", "final_fee",
            "total_paid", "balance",
            "note", "created_at",
            "payments", "student_photo_url"
        ]
        read_only_fields = ["final_fee", "created_at"]