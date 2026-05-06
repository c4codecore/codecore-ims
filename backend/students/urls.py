from django.urls import path
from . import views

urlpatterns = [
    path("sync/",              views.sync_from_sheet, name="sync-sheet"),
    path("",                   views.student_list,    name="student-list"),
    path("<int:pk>/",          views.student_detail,  name="student-detail"),
    path("stats/",             views.dashboard_stats, name="dashboard-stats"),
    path("courses/",           views.course_list,     name="course-list"),
    path("courses/<int:pk>/",  views.course_update,   name="course-update"),
]