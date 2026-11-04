
from django.db import models
from .choices import CLASS_CHOICES


class Task(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    student_class = models.PositiveIntegerField(
        choices=CLASS_CHOICES,
        db_index=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - Class {self.student_class}"
