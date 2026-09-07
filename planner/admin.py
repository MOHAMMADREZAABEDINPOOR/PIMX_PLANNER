from django.contrib import admin

from .models import (
    AssessmentRecord,
    DailyChecklist,
    DailyTaskStatus,
    DailyTaskTemplate,
    VideoPlan,
    VideoWatchLog,
)


@admin.register(VideoPlan)
class VideoPlanAdmin(admin.ModelAdmin):
    list_display = ("subject", "total_videos", "watched_total", "remaining_videos", "updated_at")
    list_filter = ("subject",)


@admin.register(VideoWatchLog)
class VideoWatchLogAdmin(admin.ModelAdmin):
    list_display = ("date", "subject", "videos_watched", "created_at")
    list_filter = ("subject", "date")
    search_fields = ("note",)


class DailyTaskStatusInline(admin.TabularInline):
    model = DailyTaskStatus
    extra = 0


@admin.register(DailyTaskTemplate)
class DailyTaskTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "importance", "is_required", "is_active", "is_builtin", "created_at")
    list_filter = ("is_required", "is_active", "is_builtin")
    search_fields = ("name",)


@admin.register(DailyChecklist)
class DailyChecklistAdmin(admin.ModelAdmin):
    list_display = ("date", "completion_rate", "created_at")
    inlines = [DailyTaskStatusInline]
    date_hierarchy = "date"


@admin.register(AssessmentRecord)
class AssessmentRecordAdmin(admin.ModelAdmin):
    list_display = ("subject", "exam_date", "score", "note", "created_at")
    list_filter = ("subject",)
    search_fields = ("note",)
