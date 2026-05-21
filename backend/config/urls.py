from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.urls import re_path
from django.views.generic import TemplateView

urlpatterns = [
    path("admin/",        admin.site.urls),
    path("api/students/", include("students.urls")),
    path("api/auth/",     include("users.urls")), 
    path("api/fees/",     include("fees.urls")),    
    path("api/attendance/", include("attendance.urls")),
    re_path(r'^(?!api/).*$', TemplateView.as_view(template_name='index.html')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)