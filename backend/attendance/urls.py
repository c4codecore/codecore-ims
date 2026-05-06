from django.urls import path
from . import views

urlpatterns = [
    path("",         views.attendance_list,    name="attendance-list"),
    path("mark/",    views.attendance_mark,    name="attendance-mark"),
    path("summary/", views.attendance_summary, name="attendance-summary"),
]