from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

urlpatterns = [
    path("register/", views.register, name="register"),
    path("login/", auth_views.LoginView.as_view(
        template_name="accounts/login.html"
    ), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("profile/", views.profile, name="profile"),
    path("lab-practical/", views.lp, name="lab_practical"),
    # path("f1st/", views.f1st, name="f1st"),
    path("1st/", views.f1st, name="1stst"),


]
    

