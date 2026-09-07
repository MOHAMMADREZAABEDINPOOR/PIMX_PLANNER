from django.urls import path

from . import views

app_name = "planner"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("api/video-data/", views.video_chart_data, name="video_chart_data"),
    path("api/assessment-data/", views.assessment_chart_data, name="assessment_chart_data"),
    path("api/completion-data/", views.completion_chart_data, name="completion_chart_data"),
    path("api/calendar-events/", views.calendar_events_data, name="calendar_events_data"),
]
