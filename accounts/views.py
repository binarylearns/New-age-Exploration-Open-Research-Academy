
from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required

from .forms import RegisterForm
from .models import StudentProfile


# =========================
# REGISTER
# =========================

def register(request):
    if request.user.is_authenticated:
        return redirect("profile")

    form = RegisterForm(request.POST or None)

    if request.method == "POST" and form.is_valid():
        user = form.save()

        StudentProfile.objects.create(
            user=user,
            full_name=form.cleaned_data["full_name"],
            student_class=form.cleaned_data["student_class"],
            section=form.cleaned_data.get("section", ""),
            school=form.cleaned_data.get("school", ""),
        )

        login(request, user)
        return redirect("profile")

    return render(request, "accounts/register.html", {
        "form": form,
    })


# =========================
# PROFILE
# =========================

@login_required
def profile(request):
    student_profile = getattr(
        request.user, "student_profile", None
    )

    return render(request, "accounts/profile.html", {
        "student_profile": student_profile,
    })


# =========================
# CLASSES
# =========================

@login_required
def classes(request):
    return render(request, "accounts/classes.html")


# =========================
# LAB PRACTICAL
# =========================

@login_required
def lp(request):
    student_profile = getattr(
        request.user, "student_profile", None
    )

    return render(request, "accounts/lab_practical.html", {
        "student_profile": student_profile,
    })


# =========================
# FIRST PAGE
# =========================

@login_required
def f1st(request):
    return render(request, "accounts/1st.html")


# =========================
# ENGLISH TYPING
# =========================

@login_required
def english_typing(request):
    return render(
        request,
        "accounts/subtopics/english_typing.html"
    )




# =========================
# CLASS-WISE LESSONS
# =========================

@login_required
def class_tasks(request):
    student_profile = getattr(
        request.user, "student_profile", None
    )

    if student_profile is None:
        return redirect("profile")

    class_number = student_profile.student_class

    if class_number not in range(1, 11):
        return render(request, "accounts/classes.html")

    template_name = f"tasks/class{class_number}.html"

    return render(request, template_name)



# =========================
# Letter Play codes
# =========================

@login_required
def letter_play(request):
    return render(
        request,
        "class1_modules/letterplay.html"
    )




# =========================
# Class 1 Computer Parts 
# =========================


@login_required
def class1_computer_parts(request):
    return render(
        request,
        "class1_modules/class1_computer_parts.html"
    )



# =========================
# Meet the computer 
# =========================


@login_required
def class1_meet_the_computer(request):
    return render(
        request,
        "class1_modules/class1_meet_the_computer.html"
    )


@login_required
def class1_know_your_computer(request):
    return render(
        request,
        "class1_modules/class1_know_your_computer.html"
    )


# =========================
# Class1 drag and drop to build the computer 
# =========================

@login_required
def class1_drag_and_drop(request):
    return render(
        request,
        "class1_modules/class1_drag_and_drop.html"
    )