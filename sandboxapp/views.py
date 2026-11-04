from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .models import Task
from django.core.exceptions import ObjectDoesNotExist


def home(request):
    return render(request, "home.html")


@login_required
def student_tasks(request):
    student = request.user.student_profile

    tasks = Task.objects.filter(
        student_class=student.student_class
    ).order_by("-created_at")

    return render(
        request,
        "tasks/student_tasks.html",
        {"tasks": tasks}
    )







@login_required
def class_tasks(request):
    try:
        student = request.user.student_profile
    except ObjectDoesNotExist:
        return render(request, "tasks/no_class.html")

    if student.student_class not in range(1, 11):
        return render(request, "tasks/no_class.html")

    return render(
        request,
        f"tasks/class{student.student_class}.html"
    )
