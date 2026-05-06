from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from .models import Fee
from .serializers import FeeSerializer

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fee_list(request):
    """Saari fees — student filter bhi ho sakta hai"""
    student_id = request.query_params.get("student")
    status     = request.query_params.get("status")

    fees = Fee.objects.select_related("student", "student__course").all()

    if student_id:
        fees = fees.filter(student_id=student_id)
    if status:
        fees = fees.filter(status=status)

    serializer = FeeSerializer(fees, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def fee_create(request):
    """Nai fee entry banao"""
    serializer = FeeSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def fee_mark_paid(request, pk):
    """Fee paid mark karo"""
    try:
        fee = Fee.objects.get(pk=pk)
    except Fee.DoesNotExist:
        return Response({"error": "Fee not found"}, status=404)

    fee.status  = "paid"
    fee.paid_at = timezone.now()
    fee.save()

    return Response(FeeSerializer(fee).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fee_summary(request):
    """Dashboard ke liye fee summary"""
    total_pending = Fee.objects.filter(status="pending").count()
    total_paid    = Fee.objects.filter(status="paid").count()

    pending_amount = sum(
        f.amount for f in Fee.objects.filter(status="pending")
    )
    paid_amount = sum(
        f.amount for f in Fee.objects.filter(status="paid")
    )

    return Response({
        "total_pending"  : total_pending,
        "total_paid"     : total_paid,
        "pending_amount" : pending_amount,
        "paid_amount"    : paid_amount,
    })