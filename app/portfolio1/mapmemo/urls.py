from django.urls import path

from . import views
from django.contrib.auth import views as auth_views

app_name = "mapmemo"
urlpatterns = [
    path("", views.main, name="main"),
    path("saveicon/", views.save_icon, name="saveicon"),
    path("loadicon/", views.load_icon, name="loadicon"),
    path(
        "login/",
        auth_views.LoginView.as_view(template_name=app_name + "/login.html"),
        name="login",
    ),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("signup/", views.signup, name="signup"),
]
