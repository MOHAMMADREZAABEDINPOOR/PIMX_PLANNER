from django import forms

from .models import (
    AssessmentRecord,
    CalendarEvent,
    DailyTaskTemplate,
    SubjectChoices,
    VideoPlan,
    VideoWatchLog,
)

JALALI_INPUT_ATTRS = {
    "class": "form-control js-jalali-input",
    "placeholder": "روز / ماه / سال",
    "dir": "ltr",
    "autocomplete": "off",
}

VIDEO_SUBJECT_MEMBERS = (
    SubjectChoices.CALCULUS,
    SubjectChoices.GEOMETRY,
    SubjectChoices.DISCRETE,
    SubjectChoices.CHEMISTRY,
    SubjectChoices.PHYSICS,
)
VIDEO_SUBJECT_CHOICES = [(member.value, member.label) for member in VIDEO_SUBJECT_MEMBERS]


class VideoPlanForm(forms.ModelForm):
    class Meta:
        model = VideoPlan
        fields = ["subject", "total_videos", "target_per_day"]
        widgets = {
            "subject": forms.Select(attrs={"class": "form-control"}),
            "total_videos": forms.NumberInput(attrs={"class": "form-control", "min": 0}),
            "target_per_day": forms.NumberInput(attrs={"class": "form-control", "min": 0}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["subject"].choices = VIDEO_SUBJECT_CHOICES
        self.fields["subject"].label = "درس"


class VideoWatchLogForm(forms.ModelForm):
    class Meta:
        model = VideoWatchLog
        fields = ["subject", "date", "videos_watched", "note"]
        widgets = {
            "subject": forms.Select(attrs={"class": "form-control"}),
            "date": forms.TextInput(attrs=JALALI_INPUT_ATTRS),
            "videos_watched": forms.NumberInput(attrs={"class": "form-control", "min": 1}),
            "note": forms.TextInput(attrs={"class": "form-control", "placeholder": "یادداشت اختیاری"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["subject"].choices = VIDEO_SUBJECT_CHOICES
        self.fields["subject"].label = "درس"


class DailyTaskTemplateForm(forms.ModelForm):
    class Meta:
        model = DailyTaskTemplate
        fields = ["name", "importance", "is_required", "is_active"]
        widgets = {
            "name": forms.TextInput(attrs={"class": "form-control", "placeholder": "نام کار روزانه"}),
            "importance": forms.NumberInput(
                attrs={"class": "form-control", "min": 1, "max": 20, "step": "0.25"}
            ),
            "is_required": forms.CheckboxInput(attrs={"class": "form-check-input"}),
            "is_active": forms.CheckboxInput(attrs={"class": "form-check-input"}),
        }


class AssessmentRecordForm(forms.ModelForm):
    class Meta:
        model = AssessmentRecord
        fields = ["subject", "exam_date", "score", "note"]
        widgets = {
            "subject": forms.Select(attrs={"class": "form-control"}),
            "exam_date": forms.TextInput(attrs=JALALI_INPUT_ATTRS),
            "score": forms.NumberInput(attrs={"class": "form-control", "min": 0, "max": 20, "step": "0.25"}),
            "note": forms.TextInput(attrs={"class": "form-control", "placeholder": "یادداشت اختیاری"}),
        }


class CalendarEventForm(forms.ModelForm):
    class Meta:
        model = CalendarEvent
        fields = ["title", "date", "description"]
        widgets = {
            "title": forms.TextInput(attrs={"class": "form-control", "placeholder": "عنوان رویداد"}),
            "date": forms.TextInput(attrs=JALALI_INPUT_ATTRS),
            "description": forms.Textarea(
                attrs={"class": "form-control", "rows": 3, "placeholder": "جزئیات و یادداشت دلخواه"}
            ),
        }
