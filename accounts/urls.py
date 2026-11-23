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
    path("classes/", views.classes, name="classes"),
    path("lab-practical/", views.lp, name="lab_practical"),
    path("english_typing", views.english_typing, name="english_typing"),

    path("english_typing/", views.english_typing, name="english_typing"),
    path("my-tasks/", views.class_tasks, name="class_tasks"),
    path("class1/letter_play/", views.letter_play, name="letter_play"),
    path("class1/computer-parts/", views.class1_computer_parts,name="class1_computer_parts"),
    path("class1/meet-the-computer/", views.class1_meet_the_computer,name="class1_meet_the_computer"),
    path("class1/know-the-computer/", views.class1_know_your_computer,name="class1_know_your_computer"),
    path("class1/drag-and-drop/", views.class1_drag_and_drop,name="class1_drag_and_drop"),





]