from django.db import models
from students.models import Enrollment

class FeeStructure(models.Model):
    enrollment = models.OneToOneField(
                     Enrollment, on_delete=models.CASCADE,
                     related_name="fee_structure")
    total_fee  = models.DecimalField(max_digits=8, decimal_places=2)
    discount   = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    final_fee  = models.DecimalField(max_digits=8, decimal_places=2, editable=False)
    note       = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.final_fee = self.total_fee - self.discount
        super().save(*args, **kwargs)

    @property
    def total_paid(self):
        return sum(p.amount for p in self.payments.all())

    @property
    def balance(self):
        return self.final_fee - self.total_paid

    def __str__(self):
        return f"{self.enrollment.student.name} — ₹{self.final_fee} (balance: ₹{self.balance})"


class FeePayment(models.Model):
    PAYMENT_MODE = (
        ("cash",   "Cash"),
        ("online", "Online"),
    )

    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE,
                        related_name="payments")
    amount        = models.DecimalField(max_digits=8, decimal_places=2)
    payment_date  = models.DateField()
    payment_mode  = models.CharField(max_length=10, choices=PAYMENT_MODE, default="cash")
    month         = models.CharField(max_length=20, blank=True)
    receipt_no    = models.CharField(max_length=20, unique=True, blank=True)
    note          = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.receipt_no:
            import random
            self.receipt_no = f"RC{self.payment_date.strftime('%y%m%d')}{random.randint(1000,9999)}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.fee_structure.enrollment.student.name} — ₹{self.amount} — {self.payment_date}"