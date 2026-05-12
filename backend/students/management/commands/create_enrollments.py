from django.core.management.base import BaseCommand
from students.models import Student, Enrollment
from django.utils import timezone

class Command(BaseCommand):
    help = "Create enrollments for existing students who have course but no enrollment"

    def handle(self, *args, **kwargs):
        students = Student.objects.filter(
            course__isnull=False,
            enrollments__isnull=True
        ).select_related("course")

        created = 0
        for student in students:
            # admission_date is DateTimeField — convert to date
            start = student.admission_date.date() if student.admission_date else timezone.now().date()
            
            Enrollment.objects.create(
                student    = student,
                course     = student.course,
                status     = student.status,
                start_date = start,
                fee_amount = student.total_fees,
            )
            created += 1
            self.stdout.write(f"✅ {student.name} → {student.course.name}")

        self.stdout.write(self.style.SUCCESS(f"\n🎉 {created} enrollments created!"))