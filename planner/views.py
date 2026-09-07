from datetime import date, timedelta
from urllib.parse import urlencode

from django.contrib import messages
from django.db.models import Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.utils import timezone

from .forms import (
    AssessmentRecordForm,
    CalendarEventForm,
    DailyTaskTemplateForm,
    VideoPlanForm,
    VideoWatchLogForm,
)
from .models import (
    AssessmentRecord,
    CalendarEvent,
    DailyChecklist,
    DailyTaskStatus,
    SubjectChoices,
    VideoPlan,
    VideoWatchLog,
)

SECTION_TEMPLATES = {
    "tasks": "dashboard/_tasks_panel.html",
    "videos": "dashboard/_videos_panel.html",
    "assessments": "dashboard/_assessments_panel.html",
    "calendar": "dashboard/_calendar_panel.html",
}

SECTION_REFRESH_MAP = {
    "toggle_task": ["tasks"],
    "add_task_template": ["tasks"],
    "save_plan": ["videos"],
    "add_log": ["videos"],
    "add_assessment": ["assessments"],
    "add_event": ["calendar"],
}

CALENDAR_REFRESH_ACTIONS = {"add_event"}


def _parse_date_from_request(request):
    date_str = request.GET.get("date")
    if not date_str:
        return timezone.localdate()
    try:
        return timezone.datetime.fromisoformat(date_str).date()
    except ValueError:
        return timezone.localdate()


def _serialize_messages(request):
    serialized = []
    for message in messages.get_messages(request):
        serialized.append({"level": message.tags, "text": message.message})
    return serialized


def _render_sections(section_keys, context, request):
    rendered = {}
    for key in section_keys:
        template_name = SECTION_TEMPLATES.get(key)
        if template_name:
            rendered[key] = render_to_string(template_name, context, request=request)
    return rendered


def _build_dashboard_context(target_date, form_overrides=None):
    checklist = DailyChecklist.ensure_for_date(target_date)
    plan_form = VideoPlanForm()
    log_form = VideoWatchLogForm(initial={"date": target_date})
    template_form = DailyTaskTemplateForm()
    assessment_form = AssessmentRecordForm()
    event_form = CalendarEventForm()

    if form_overrides:
        plan_form = form_overrides.get("plan_form", plan_form)
        log_form = form_overrides.get("log_form", log_form)
        template_form = form_overrides.get("template_form", template_form)
        assessment_form = form_overrides.get("assessment_form", assessment_form)
        event_form = form_overrides.get("event_form", event_form)

    video_plans = list(VideoPlan.objects.all())
    watch_totals = {
        row["subject"]: row["total"]
        for row in VideoWatchLog.objects.values("subject").annotate(total=Sum("videos_watched"))
    }
    video_plan_cards = []
    for plan in video_plans:
        total_videos = plan.total_videos or 0
        watched = watch_totals.get(plan.subject, 0) or 0
        progress = round((watched / total_videos) * 100, 1) if total_videos else 0
        remaining = max(total_videos - watched, 0)
        video_plan_cards.append(
            {
                "plan": plan,
                "watched": watched,
                "remaining": remaining,
                "progress": progress,
            }
        )

    tasks = checklist.task_statuses.select_related("task_template").order_by(
        "-task_template__is_required", "task_template__name"
    )
    task_stats = {
        "total": tasks.count(),
        "done": tasks.filter(done=True).count(),
    }
    task_stats["remaining"] = max(task_stats["total"] - task_stats["done"], 0)
    task_stats["completion"] = checklist.completion_rate()

    assessments = AssessmentRecord.objects.order_by("-exam_date")[:10]

    def completion_average(days: int) -> float:
        start = timezone.localdate() - timedelta(days=days - 1)
        checklists = DailyChecklist.objects.filter(date__gte=start)
        if not checklists:
            return 0
        total = sum([c.completion_rate() for c in checklists])
        return round(total / len(checklists), 2)

    completion_windows = {
        "۷ روز": completion_average(7),
        "۳۰ روز": completion_average(30),
        "۶۰ روز": completion_average(60),
        "۹۰ روز": completion_average(90),
        "۱۸۰ روز": completion_average(180),
        "۳۶۵ روز": completion_average(365),
    }

    upcoming_events = (
        CalendarEvent.objects.filter(date__gte=timezone.localdate()).order_by("date")[:8]
    )

    return {
        "target_date": target_date,
        "checklist": checklist,
        "tasks": tasks,
        "task_stats": task_stats,
        "video_plans": video_plans,
        "video_plan_cards": video_plan_cards,
        "assessments": assessments,
        "plan_form": plan_form,
        "log_form": log_form,
        "template_form": template_form,
        "assessment_form": assessment_form,
        "event_form": event_form,
        "completion_windows": completion_windows,
        "latest_assessment": assessments[0] if assessments else None,
        "upcoming_events": upcoming_events,
        "calendar_focus_date": timezone.localdate(),
        "SubjectChoices": SubjectChoices,
    }


def dashboard(request):
    target_date = _parse_date_from_request(request)
    active_section = request.GET.get("section", "tasks")
    is_ajax = request.headers.get("x-requested-with") == "XMLHttpRequest"
    form_overrides = {}
    success = False
    action = None

    if request.method == "POST":
        action = request.POST.get("action")
        active_section = request.POST.get("section", active_section)
        redirect_url = request.path

        if action == "save_plan":
            existing_plan = VideoPlan.objects.filter(subject=request.POST.get("subject")).first()
            plan_form = VideoPlanForm(request.POST, instance=existing_plan)
            if plan_form.is_valid():
                plan_form.save()
                success = True
                messages.success(request, "برنامه درس با موفقیت ذخیره شد.")
            else:
                form_overrides["plan_form"] = plan_form
                messages.error(request, "ذخیره برنامه با خطا مواجه شد.")

        elif action == "add_log":
            log_form = VideoWatchLogForm(request.POST)
            if log_form.is_valid():
                log_form.save()
                success = True
                messages.success(request, "گزارش تماشا ثبت شد.")
            else:
                form_overrides["log_form"] = log_form
                messages.error(request, "ثبت گزارش تماشا ناموفق بود.")

        elif action == "add_task_template":
            template_form = DailyTaskTemplateForm(request.POST)
            if template_form.is_valid():
                template = template_form.save(commit=False)
                template.is_builtin = False
                template.save()
                success = True
                messages.success(request, "کار روزانه جدید ساخته شد.")
            else:
                form_overrides["template_form"] = template_form
                messages.error(request, "ساختن کار روزانه جدید انجام نشد.")

        elif action == "toggle_task":
            status = get_object_or_404(
                DailyTaskStatus, pk=request.POST.get("status_id"), checklist__date=target_date
            )
            success = True
            status.done = not status.done
            status.save()
            messages.success(request, "وضعیت کار به‌روزرسانی شد.")

        elif action == "add_assessment":
            assessment_form = AssessmentRecordForm(request.POST)
            if assessment_form.is_valid():
                assessment_form.save()
                success = True
                messages.success(request, "نمره جدید ثبت شد.")
            else:
                form_overrides["assessment_form"] = assessment_form
                messages.error(request, "ثبت نمره انجام نشد.")

        elif action == "add_event":
            event_form = CalendarEventForm(request.POST)
            if event_form.is_valid():
                event_form.save()
                success = True
                messages.success(request, "رویداد در تقویم ذخیره شد.")
            else:
                form_overrides["event_form"] = event_form
                messages.error(request, "ذخیره رویداد امکان‌پذیر نبود.")

        else:
            messages.error(request, "درخواست پشتیبانی‌نشده است.")

        if is_ajax:
            context = _build_dashboard_context(target_date, form_overrides=form_overrides)
            context["active_section"] = active_section
            sections_to_update = SECTION_REFRESH_MAP.get(action, [])
            if action == "add_event" and not success and form_overrides:
                sections_to_update = ["calendar"]
            payload = {
                "success": success,
                "messages": _serialize_messages(request),
                "sections": _render_sections(sections_to_update, context, request)
                if success or form_overrides
                else {},
                "active_section": active_section,
            }
            if action in CALENDAR_REFRESH_ACTIONS and success:
                payload["calendar_refresh"] = True
            status_code = 200 if success else 400
            return JsonResponse(payload, status=status_code)

        query_string = urlencode({"date": target_date.isoformat(), "section": active_section})
        return redirect(f"{redirect_url}?{query_string}")

    context = _build_dashboard_context(target_date)
    context["active_section"] = active_section
    return render(request, "dashboard.html", context)


def video_chart_data(request):
    logs = VideoWatchLog.objects.order_by("date", "subject")
    series = {}
    for log in logs:
        label = log.get_subject_display()
        series.setdefault(label, [])
        series[label].append({"x": log.date.isoformat(), "y": log.videos_watched})
    return JsonResponse({"series": series})


def assessment_chart_data(request):
    assessments = AssessmentRecord.objects.order_by("exam_date")
    series = {}
    for record in assessments:
        label = record.get_subject_display()
        series.setdefault(label, [])
        series[label].append({"x": record.exam_date.isoformat(), "y": float(record.score)})
    return JsonResponse({"series": series})


def completion_chart_data(request):
    checklists = DailyChecklist.objects.order_by("date")
    data = [{"x": checklist.date.isoformat(), "y": checklist.completion_rate()} for checklist in checklists]
    return JsonResponse({"series": {"روند تکمیل روزانه": data}})


def calendar_events_data(request):
    month_str = request.GET.get("month")
    day_str = request.GET.get("day")
    today = timezone.localdate()

    if day_str:
        try:
            target = timezone.datetime.fromisoformat(day_str).date()
        except ValueError:
            target = today
        events = CalendarEvent.objects.filter(date=target).order_by("title")
        payload = [
            {
                "id": event.id,
                "title": event.title,
                "date": event.date.isoformat(),
                "description": event.description,
            }
            for event in events
        ]
        day_label = target.strftime("%Y-%m-%d")
        return JsonResponse({"events": payload, "day": target.isoformat(), "day_label": day_label})

    if month_str:
        try:
            year, month = map(int, month_str.split("-"))
            start = date(year, month, 1)
        except ValueError:
            start = today.replace(day=1)
    else:
        start = today.replace(day=1)
    if start.month == 12:
        end = date(start.year + 1, 1, 1)
    else:
        end = date(start.year, start.month + 1, 1)

    events = CalendarEvent.objects.filter(date__gte=start, date__lt=end).order_by("date", "title")
    payload = [
        {"id": event.id, "title": event.title, "date": event.date.isoformat(), "description": event.description}
        for event in events
    ]
    return JsonResponse({"events": payload, "month": start.strftime("%Y-%m")})
