from django.db import migrations


def seed_tasks(apps, schema_editor):
    TaskTemplate = apps.get_model("planner", "DailyTaskTemplate")
    defaults = [
        ("مسواک زدم", 5),
        ("ورزش", 12),
        ("درس خواندن", 15),
        ("کتاب خواندن", 10),
        ("زبان", 10),
        ("اخلاق خوب", 8),
        ("مدیتیشن", 7),
    ]
    for name, importance in defaults:
        TaskTemplate.objects.get_or_create(
            name=name,
            defaults={"importance": importance, "is_required": True, "is_active": True, "is_builtin": True},
        )


def unseed_tasks(apps, schema_editor):
    TaskTemplate = apps.get_model("planner", "DailyTaskTemplate")
    TaskTemplate.objects.filter(is_builtin=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("planner", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_tasks, reverse_code=unseed_tasks),
    ]
