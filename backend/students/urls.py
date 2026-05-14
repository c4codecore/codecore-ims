from django.urls import path
from . import views

urlpatterns = [
    path("sync/",                  views.sync_from_sheet,     name="sync-sheet"),
    path("sync-details/",          views.sync_details,        name="sync-details"),       # ← NAYA
    path("",                       views.student_list,        name="student-list"),
    path("<int:pk>/",              views.student_detail,      name="student-detail"),
    path("stats/",                 views.dashboard_stats,     name="dashboard-stats"),
    path("courses/",               views.course_list,         name="course-list"),
    path("courses/<int:pk>/",      views.course_update,       name="course-update"),
    path("<int:pk>/enrollments/",  views.student_enrollments, name="student-enrollments"),
    path("enrollments/<int:pk>/",  views.enrollment_update,   name="enrollment-update"),
    path("proxy-image/",           views.proxy_drive_image,   name="proxy-image"),
]