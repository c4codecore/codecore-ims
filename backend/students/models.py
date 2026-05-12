from django.db import models

class Course(models.Model):
    FEE_TYPE_CHOICES = (
        ("monthly",     "Monthly"),
        ("quarterly",   "Quarterly"),
        ("full",        "Full Payment"),
    )
     
    name              = models.CharField(max_length=100)
    short_name        = models.CharField(max_length=20, blank=True)  # DCA, ADCA, DAC
    description       = models.TextField(blank=True)
    duration_months   = models.PositiveIntegerField()
    total_fee         = models.DecimalField(max_digits=10, decimal_places=2)
    offer_fee         = models.DecimalField(max_digits=10, decimal_places=2, 
                                            null=True, blank=True)  # discounted price
    fee_type          = models.CharField(max_length=10, choices=FEE_TYPE_CHOICES, 
                                         default="monthly")
    is_active         = models.BooleanField(default=True)  # future me band kr skte ho
    created_at        = models.DateTimeField(auto_now_add=True)

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

    admission_date     = models.DateTimeField(null=True, blank=True)   # actual admission date
    total_fees         = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    comments           = models.TextField(blank=True)

    # Internal fields
    status             = models.CharField(max_length=10, choices=STATUS_CHOICES,
                                          default="active")
    
    # Google Sheet sync tracking
    sheet_row          = models.PositiveIntegerField(null=True, blank=True)
    synced_at          = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} — {self.course}"


class Enrollment(models.Model):
    STATUS_CHOICES = (
        ("active",    "Active"),
        ("completed", "Completed"),
        ("dropped",   "Dropped"),
    )

    student    = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="enrollments")
    course     = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True, related_name="enrollments")
    roll_no    = models.CharField(max_length=100, unique=True, null=True, blank=True)
    session    = models.IntegerField(null=True, blank=True)   # months: 3, 6, 12
    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    start_date = models.DateField()
    end_date   = models.DateField(null=True, blank=True)
    fee_amount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    note       = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.student.name} → {self.course.name if self.course else '—'} ({self.roll_no})"