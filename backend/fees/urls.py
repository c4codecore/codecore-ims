from django.urls import path
from . import views

urlpatterns = [
    path("",                           views.fee_structure_list,   name="fee-list"),
    path("create/",                    views.fee_structure_create, name="fee-create"),
    path("<int:pk>/",                  views.fee_structure_detail, name="fee-detail"),
    path("<int:pk>/update/",           views.fee_structure_detail, name="fee-update"),  
    path("payments/create/",           views.fee_payment_create,   name="fee-payment-create"),
    path("payments/<int:pk>/delete/",  views.fee_payment_delete,   name="fee-payment-delete"),
    path("payments/send-receipt/",     views.send_receipt,         name="fee-send-receipt"),
    path("summary/",                   views.fee_summary,          name="fee-summary"),
    path("due-reminders/",             views.fee_due_reminders,    name="fee-due-reminders"),
]