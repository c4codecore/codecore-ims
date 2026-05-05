from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ("admin",   "Admin"),
        ("teacher", "Teacher"),
        ("student", "Student"),
    )
    role  = models.CharField(max_length=10, choices=ROLE_CHOICES, default="student")
    phone = models.CharField(max_length=15, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"