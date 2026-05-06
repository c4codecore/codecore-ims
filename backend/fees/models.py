from django.db import models
from students.models import Student, Enrollment

class Fee(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("paid",    "Paid"),
    )

    student    = models.ForeignKey(Student, on_delete=models.CASCADE, 
                                   related_name="fees")
    amount     = models.DecimalField(max_digits=8, decimal_places=2)
    month      = models.DateField()          # kis month ki fee hai
    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, 
                                  default="pending")
    paid_at    = models.DateTimeField(null=True, blank=True)
    note       = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE,
                                   related_name="fees", null=True, blank=True)

    class Meta:
        ordering = ["-month"]

    def __str__(self):
        return f"{self.student.name} — {self.month} — {self.status}"

