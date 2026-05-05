from django.db import models

class Course(models.Model):
    FEE_TYPE_CHOICES = (
        ("monthly",     "Monthly"),
        ("quarterly",   "Quarterly"),
    )
    name             = models.CharField(max_length=100)
    duration_months  = models.PositiveIntegerField()
    total_fee        = models.DecimalField(max_digits=10, decimal_places=2)
    fee_type         = models.CharField(max_length=10, choices=FEE_TYPE_CHOICES, default="monthly")

    def __str__(self):
        return self.name


class Student(models.Model):
    GENDER_CHOICES = (
        ("Male",   "Male"),
        ("Female", "Female"),
        ("Other",  "Other"),
    )
    STATUS_CHOICES = (
        ("active",    "Active"),
        ("completed", "Completed"),
        ("dropped",   "Dropped"),
    )

    # Google Form fields
    name               = models.CharField(max_length=100)
    father_name        = models.CharField(max_length=100)
    mother_name        = models.CharField(max_length=100)
    dob                = models.DateField(null=True, blank=True)
    gender             = models.CharField(max_length=10, choices=GENDER_CHOICES)
    qualification      = models.CharField(max_length=100)
    address            = models.TextField()
    phone              = models.CharField(max_length=15)
    email              = models.EmailField(unique=True)
    aadhaar_number     = models.CharField(max_length=20, blank=True)

    # Google Drive links (Form se aate hain)
    photo_url          = models.URLField(blank=True)
    aadhaar_front_url  = models.URLField(blank=True)
    aadhaar_back_url   = models.URLField(blank=True)

    # Course
    course             = models.ForeignKey(Course, on_delete=models.SET_NULL,
                                           null=True, blank=True)
    comments           = models.TextField(blank=True)

    # Internal fields
    join_date          = models.DateField(auto_now_add=True)
    status             = models.CharField(max_length=10, choices=STATUS_CHOICES,
                                          default="active")
    
    # Google Sheet sync tracking
    sheet_row          = models.PositiveIntegerField(null=True, blank=True)
    synced_at          = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} — {self.course}"