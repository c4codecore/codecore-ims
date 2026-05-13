import base64
import datetime
from django.core.mail import EmailMessage
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import FeeStructure, FeePayment
from .serializers import FeeStructureSerializer, FeePaymentSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def fee_structure_list(request):
    """Saari fee structures — student ya enrollment filter"""
    student_id = request.query_params.get("student")
    enrollment_id = request.query_params.get("enrollment")

    fees = (
        FeeStructure.objects.select_related(
            "enrollment", "enrollment__student", "enrollment__course"
        )
        .prefetch_related("payments")
        .all()
    )

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
        fee = (
            FeeStructure.objects.select_related(
                "enrollment", "enrollment__student", "enrollment__course"
            )
            .prefetch_related("payments")
            .get(pk=pk)
        )
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

    total_final = sum(f.final_fee for f in structures)
    total_paid = sum(f.total_paid for f in structures)
    total_balance = sum(f.balance for f in structures)

    return Response(
        {
            "total_final_fee": total_final,
            "total_paid": total_paid,
            "total_balance": total_balance,
            "total_students": structures.count(),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_receipt(request):
    """Student ko email pe PDF receipt bhejo"""
    try:
        email = request.data.get("email", "").strip()
        student_name = request.data.get("student_name", "Student")
        receipt_no = request.data.get("receipt_no", "")
        amount = request.data.get("amount", "")
        course_name = request.data.get("course_name", "")
        pdf_base64 = request.data.get("pdf_base64", "")

        if not email:
            return Response({"error": "Email address nahi mila."}, status=400)
        if not pdf_base64:
            return Response({"error": "PDF data nahi mila."}, status=400)

        if "," in pdf_base64:
            pdf_base64 = pdf_base64.split(",", 1)[1]

        pdf_bytes = base64.b64decode(pdf_base64)
        payment_date = datetime.date.today().strftime("%d %B %Y")

        html_body = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">
  <div style="background:#1a3a6b;padding:28px 32px;text-align:center;">
    <div style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:1px;">CODE CORE COMPUTER CENTER</div>
    <div style="font-size:12px;color:#a8c4e8;margin-top:4px;">Empowering Futures Through Technology</div>
  </div>
  <div style="background:#e8f5e9;border-left:4px solid #2e7d32;padding:14px 32px;">
    <div style="font-size:14px;font-weight:bold;color:#1b5e20;">&#10003; Payment Received Successfully</div>
    <div style="font-size:12px;color:#388e3c;">Your fee payment has been confirmed.</div>
  </div>
  <div style="padding:28px 32px;">
    <p style="font-size:15px;color:#333;margin:0 0 6px;">Dear <strong>{student_name}</strong>,</p>
    <p style="font-size:14px;color:#555;margin:0 0 24px;line-height:1.7;">
      Thank you for your payment. We are pleased to confirm that your fee has been successfully received.
      Please find your receipt details below and keep the attached PDF for your records.
    </p>
    <div style="background:#f8f9ff;border:1px solid #dce3f5;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <div style="background:#1a3a6b;padding:10px 20px;">
        <span style="font-size:13px;font-weight:bold;color:#ffffff;">RECEIPT DETAILS</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #e8ecf5;">
          <td style="padding:12px 20px;font-size:13px;color:#888;width:45%;">Receipt No.</td>
          <td style="padding:12px 20px;font-size:13px;font-weight:bold;color:#1a3a6b;font-family:monospace;">{receipt_no}</td>
        </tr>
        <tr style="border-bottom:1px solid #e8ecf5;background:#ffffff;">
          <td style="padding:12px 20px;font-size:13px;color:#888;">Amount Paid</td>
          <td style="padding:12px 20px;font-size:15px;font-weight:bold;color:#2e7d32;">Rs. {amount}</td>
        </tr>
        <tr style="border-bottom:1px solid #e8ecf5;">
          <td style="padding:12px 20px;font-size:13px;color:#888;">Course</td>
          <td style="padding:12px 20px;font-size:13px;font-weight:bold;color:#333;">{course_name}</td>
        </tr>
        <tr>
          <td style="padding:12px 20px;font-size:13px;color:#888;">Payment Date</td>
          <td style="padding:12px 20px;font-size:13px;color:#333;">{payment_date}</td>
        </tr>
      </table>
    </div>
    <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:12px 16px;font-size:13px;color:#795548;margin-bottom:24px;">
      &#128206; <strong>Fee Receipt PDF</strong> is attached with this email. Please keep it safe for your records.
    </div>
    <p style="font-size:13px;color:#777;line-height:1.6;margin:0;">
      If you have any questions, please feel free to contact us. We are always happy to help.
    </p>
  </div>
  <div style="height:1px;background:#e0e0e0;margin:0 32px;"></div>
  <div style="padding:24px 32px;">
    <p style="font-family:Georgia,serif;font-size:15px;color:#555;margin:0 0 16px;font-style:italic;">Kind regards,</p>
    <table style="border-collapse:collapse;width:100%;">
      <tr>
        <td style="vertical-align:top;padding-right:16px;width:90px;">
          <img src="https://lh3.googleusercontent.com/a/ACg8ocIn3bK5i39X27lsvIf2WHhnZabXPrnXtMbrGhqXIkI3qYGUYBo=s360-c-no" alt="Logo" width="80" style="display:block;border-radius:6px;">
        </td>
        <td style="vertical-align:top;">
          <div style="font-size:15px;font-weight:bold;color:#1a1a1a;">Dimpy &amp; Neeraj Sharma</div>
          <div style="font-size:13px;color:#8B0000;font-weight:bold;margin:2px 0 6px;">Code Core Computer Center</div>
          <div style="height:1px;background:#e0e0e0;margin-bottom:8px;"></div>
          <div style="font-size:12px;color:#666;line-height:1.7;">
            Pataudi Road, Near Police Chowki<br>Gurugram - 122001<br>+91 901 301 0909
          </div>
        </td>
      </tr>
    </table>
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid #e0e0e0;">
      <span style="font-size:12px;color:#888;margin-right:8px;">Find us here:</span>
      <a href="https://wa.me/+919013010909" style="margin-right:6px;">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/180px-WhatsApp.svg.png" alt="WhatsApp" style="width:22px;vertical-align:middle;">
      </a>
      <a href="https://maps.app.goo.gl/uSq5LZ9KSQqFuP2r5" style="margin-right:6px;">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Google_Maps_icon_%282020%29.svg/93px-Google_Maps_icon_%282020%29.svg.png" alt="Google Maps" style="width:14px;vertical-align:middle;">
      </a>
      <a href="https://www.instagram.com/codecorecomputercenter/">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Instagram_logo_2022.svg/225px-Instagram_logo_2022.svg.png" alt="Instagram" style="width:18px;vertical-align:middle;">
      </a>
    </div>
  </div>
  <div style="background:#1a3a6b;padding:14px 32px;text-align:center;">
    <div style="font-size:11px;color:#a8c4e8;">+91-9013010909 &nbsp;|&nbsp; info@codecore.in &nbsp;|&nbsp; www.codecore.in</div>
    <div style="font-size:11px;color:#6a9fd4;margin-top:6px;">ISO 9001:2015 | ISO 29990:2010 | ISO 21001:2018 Certified Organization</div>
    <div style="font-size:11px;color:#4a7fae;margin-top:8px;">Please consider the environment before printing this email.</div>
  </div>
</div>
</body>
</html>"""

        msg = EmailMessage(
            subject=f"Fee Receipt — {receipt_no} | CodeCore Computer Center",
            body=html_body,
            to=[email],
        )
        msg.content_subtype = "html"
        msg.attach(
            filename=f"Receipt_{receipt_no}.pdf",
            content=pdf_bytes,
            mimetype="application/pdf",
        )
        msg.send(fail_silently=False)

        return Response({"success": True})

    except Exception as e:
        return Response({"error": str(e)}, status=500)
