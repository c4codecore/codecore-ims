from django.core.management.base import BaseCommand
from students.models import Course

class Command(BaseCommand):
    help = "Seed all CodeCore courses"

    def handle(self, *args, **kwargs):
        courses = [
            {"name": "Diploma in Computer Applications",          "short_name": "DCA",   "duration_months": 6,  "total_fee": 7500,  "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Advanced Diploma in Computer Applications", "short_name": "ADCA",  "duration_months": 12, "total_fee": 15000, "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Data Analytics Certificate",                "short_name": "DAC",   "duration_months": 9,  "total_fee": 21500, "offer_fee": 20000, "fee_type": "monthly"},
            {"name": "Basic Computer Course",                     "short_name": "BCC",   "duration_months": 4,  "total_fee": 4500,  "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Python",                                    "short_name": "PY",    "duration_months": 6,  "total_fee": 15000, "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Web Designing",                             "short_name": "WD",    "duration_months": 4,  "total_fee": 7200,  "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Web Development",                           "short_name": "WDEV",  "duration_months": 6,  "total_fee": 15000, "offer_fee": None,  "fee_type": "monthly"},
            {"name": "JavaScript",                                "short_name": "JS",    "duration_months": 6,  "total_fee": 15000, "offer_fee": 12000, "fee_type": "monthly"},
            {"name": "Tally Prime",                               "short_name": "TALLY", "duration_months": 3,  "total_fee": 4500,  "offer_fee": 4000,  "fee_type": "monthly"},
            {"name": "Certificate in Office Automation",          "short_name": "COA",   "duration_months": 6,  "total_fee": 7500,  "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Advanced Excel",                            "short_name": "AEXCEL","duration_months": 2,  "total_fee": 3000,  "offer_fee": 2500,  "fee_type": "monthly"},
            {"name": "Internet & Computer Basic",                 "short_name": "ICB",   "duration_months": 3,  "total_fee": 4000,  "offer_fee": 3500,  "fee_type": "monthly"},
            # ── New courses ──────────────────────────────────────────────────────
            {"name": "Certificate in Web Development",        "short_name": "CWD",  "duration_months": 4,  "total_fee": 15000, "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Certificate in Programming Language",   "short_name": "CPL",  "duration_months": 6,  "total_fee": 15000, "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Certificate in Data Analytics",         "short_name": "CDA",  "duration_months": 9,  "total_fee": 21500, "offer_fee": 20000, "fee_type": "monthly"},
            {"name": "Certificate in Web Designing",          "short_name": "CWDS", "duration_months": 4,  "total_fee": 7200,  "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Certificate in Advanced Excel + Tally", "short_name": "CAET", "duration_months": 3,  "total_fee": 4500,  "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Certificate in Advanced Excel",         "short_name": "CAE",  "duration_months": 2,  "total_fee": 3000,  "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Certificate in Software Testing",       "short_name": "CST",  "duration_months": 3,  "total_fee": 8000,  "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Certificate in Power BI",               "short_name": "CPB",  "duration_months": 1,  "total_fee": 2000,  "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Typing Course",                         "short_name": "TYPE", "duration_months": 1,  "total_fee": 1500,  "offer_fee": None,  "fee_type": "monthly"},
            {"name": "Other",                                 "short_name": "OTH",  "duration_months": 1,  "total_fee": 0,     "offer_fee": None,  "fee_type": "monthly"},
        ]

        for c in courses:
            course, created = Course.objects.get_or_create(
                short_name=c["short_name"],
                defaults=c
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"[+] Created: {course.name}"))
            else:
                self.stdout.write(self.style.WARNING(f"-- Skipped: {course.name}"))

        self.stdout.write(self.style.SUCCESS("\nAll courses seeded!"))