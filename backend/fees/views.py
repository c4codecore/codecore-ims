from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import FeeStructure, FeePayment
from .serializers import FeeStructureSerializer, FeePaymentSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fee_structure_list(request):
    """Saari fee structures — student ya enrollment filter"""
    student_id    = request.query_params.get("student")
    enrollment_id = request.query_params.get("enrollment")

    fees = FeeStructure.objects.select_related(
        "enrollment", "enrollment__student", "enrollment__course"
    ).prefetch_related("payments").all()

    if student_id:
        fees = fees.filter(enrollment__student_id=student_id)
    if enrollment_id:
        fees = fees.filter(enrollment_id=enrollment_id)

    return Response(FeeStructureSerializer(fees, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def fee_structure_create(request):
    """Enrollment ke liye fee structure banao"""
    serializer = FeeStructureSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def fee_structure_detail(request, pk):
    """Fee structure detail + update"""
    try:
        fee = FeeStructure.objects.select_related(
            "enrollment", "enrollment__student", "enrollment__course"
        ).prefetch_related("payments").get(pk=pk)
    except FeeStructure.DoesNotExist:
        return Response({"error": "Fee structure not found"}, status=404)

    if request.method == "GET":
        return Response(FeeStructureSerializer(fee).data)

    serializer = FeeStructureSerializer(fee, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(FeeStructureSerializer(fee).data)
    return Response(serializer.errors, status=400)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def fee_payment_create(request):
    """Nai payment/installment add karo"""
    serializer = FeePaymentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def fee_payment_delete(request, pk):
    """Payment delete karo (galti se entry hui ho)"""
    try:
        payment = FeePayment.objects.get(pk=pk)
        payment.delete()
        return Response({"message": "Payment deleted"})
    except FeePayment.DoesNotExist:
        return Response({"error": "Payment not found"}, status=404)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fee_summary(request):
    """Dashboard ke liye fee summary"""
    from decimal import Decimal

    structures = FeeStructure.objects.prefetch_related("payments").all()

    total_final   = sum(f.final_fee   for f in structures)
    total_paid    = sum(f.total_paid  for f in structures)
    total_balance = sum(f.balance     for f in structures)

    return Response({
        "total_final_fee" : total_final,
        "total_paid"      : total_paid,
        "total_balance"   : total_balance,
        "total_students"  : structures.count(),
    })