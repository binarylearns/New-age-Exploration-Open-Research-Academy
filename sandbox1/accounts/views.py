from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.shortcuts import render, redirect
from django.contrib.auth import logout
from django.shortcuts import redirect


def register(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)

        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("home")
    else:
        form = UserCreationForm()

    return render(
        request,
        "accounts/register.html",
        {"form": form}
    )


def profile(request):
    return render(request,"accounts/profile.html")    




@login_required
def home(request):
    return render(request, "accounts/home.html")


@login_required
def lp(request):
    return render(request, "accounts/lp.html")


def logout_view(request):
    logout(request)
    return redirect('sandbox1:home')   # cross-app redirect by name