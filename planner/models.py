from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils import timezone


class SubjectChoices(models.TextChoices):
    CALCULUS = "calculus", "حسابان"
    GEOMETRY = "geometry", "هندسه"
    DISCRETE = "discrete", "گسسته"
    CHEMISTRY = "chemistry", "شیمی"
    PHYSICS = "physics", "فیزیک"
    SOCIAL_IDENTITY = "social_identity", "هویت اجتماعی"
    HEALTH = "health", "سلامت بهداشت"
    PERSIAN = "persian", "فارسی"
    ARABIC = "arabic", "عربی"
    ENGLISH = "english", "زبان انگلیسی"
    RELIGION = "religion", "دینی"
    FAMILY_MANAGEMENT = "family_management", "مدیریت خانواده"


class VideoPlan(models.Model):
    subject = models.CharField(max_length=50, choices=SubjectChoices.choices, unique=True)
    total_videos = models.PositiveIntegerField()
    target_per_day = models.PositiveIntegerField(default=0, help_text="اختیاری: هدف روزانه برای مشاهده ویدیو")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "برنامه ویدیو"
        verbose_name_plural = "برنامه‌های ویدیو"

    def __str__(self) -> str:
        return f"{self.get_subject_display()} - {self.total_videos} ویدیو"

    @property
    def watched_total(self) -> int:
        return (
            VideoWatchLog.objects.filter(subject=self.subject)
            .aggregate(models.Sum("videos_watched"))
            .get("videos_watched__sum")
            or 0
        )

    @property
    def remaining_videos(self) -> int:
        remaining = self.total_videos - self.watched_total
        return remaining if remaining > 0 else 0


class VideoWatchLog(models.Model):
    subject = models.CharField(max_length=50, choices=SubjectChoices.choices)
    date = models.DateField(default=timezone.localdate)
    videos_watched = models.PositiveIntegerField()
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "مشاهده ویدیو"
        verbose_name_plural = "گزارش‌های مشاهده ویدیو"
        ordering = ["-date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.date} - {self.get_subject_display()} ({self.videos_watched})"


class DailyTaskTemplate(models.Model):
    name = models.CharField(max_length=120)
    importance = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
        default=10,
        help_text="اهمیت از 1 تا 20؛ امکان اعشار دو رقم.",
    )
    is_required = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    is_builtin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "الگوی کار روزانه"
        verbose_name_plural = "الگوهای کار روزانه"
        ordering = ["-is_builtin", "name"]

    def __str__(self) -> str:
        return self.name


class DailyChecklist(models.Model):
    date = models.DateField(default=timezone.localdate, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "چک‌لیست روزانه"
        verbose_name_plural = "چک‌لیست‌های روزانه"
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"برنامه روز {self.date}"

    def completion_rate(self) -> float:
        items = self.task_statuses.all()
        if not items:
            return 0
        done_weight = 0
        total_weight = 0
        for item in items:
            total_weight += float(item.task_template.importance)
            if item.done:
                done_weight += float(item.task_template.importance)
        return round((done_weight / total_weight) * 100, 2) if total_weight else 0

    @classmethod
    def ensure_for_date(cls, date):
        checklist, _ = cls.objects.get_or_create(date=date)
        # Auto-attach all active templates that are not yet linked.
        existing_template_ids = checklist.task_statuses.values_list("task_template_id", flat=True)
        missing_templates = DailyTaskTemplate.objects.filter(is_active=True).exclude(id__in=existing_template_ids)
        DailyTaskStatus.objects.bulk_create(
            [
                DailyTaskStatus(task_template=template, checklist=checklist, done=False)
                for template in missing_templates
            ]
        )
        return checklist


class DailyTaskStatus(models.Model):
    task_template = models.ForeignKey(
        DailyTaskTemplate, on_delete=models.CASCADE, related_name="statuses"
    )
    checklist = models.ForeignKey(
        DailyChecklist, on_delete=models.CASCADE, related_name="task_statuses"
    )
    done = models.BooleanField(default=False)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "وضعیت کار روزانه"
        verbose_name_plural = "وضعیت‌های کار روزانه"
        unique_together = ("task_template", "checklist")

    def __str__(self) -> str:
        return f"{self.task_template} - {self.checklist.date}"


class AssessmentRecord(models.Model):
    subject = models.CharField(max_length=50, choices=SubjectChoices.choices)
    exam_date = models.DateField(default=timezone.localdate)
    score = models.DecimalField(
        max_digits=4, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(20)]
    )
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "نمره/ارزیابی"
        verbose_name_plural = "نمرات و ارزیابی‌ها"
        ordering = ["-exam_date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.get_subject_display()} - {self.score}"


class CalendarEvent(models.Model):
    title = models.CharField(max_length=180)
    date = models.DateField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "رویداد تقویم"
        verbose_name_plural = "رویدادهای تقویم"
        ordering = ["date", "title"]

    def __str__(self) -> str:
        return f"{self.title} - {self.date}"

# Create your models here.
