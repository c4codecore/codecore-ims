from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path("login/",         views.LoginView.as_view(), name="login"),
    path("logout/",        views.logout_view,         name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/",            views.me_view,             name="me"),
]