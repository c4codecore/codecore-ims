from django.db import models
from students.models import Student

class Attendance(models.Model):
    STATUS_CHOICES = (
        ("present", "Present"),
        ("absent",  "Absent"),
        ("leave",   "Leave"),
    )

    student    = models.ForeignKey(Student, on_delete=models.CASCADE,
                                   related_name="attendance")
    date       = models.DateField()
    status     = models.CharField(max_length=10, choices=STATUS_CHOICES,
                                  default="absent")
    note       = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ["student", "date"]

    def __str__(self):
        return f"{self.student.name} — {self.date} — {self.status}"