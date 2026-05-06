from django.urls import path
from . import views

urlpatterns = [
    path("",            views.fee_list,      name="fee-list"),
    path("create/",     views.fee_create,    name="fee-create"),
    path("<int:pk>/paid/", views.fee_mark_paid, name="fee-mark-paid"),
    path("summary/",    views.fee_summary,   name="fee-summary"),
]