# Generated by Django 5.0.9 on 2024-11-07 15:08

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("authentik_tenants", "0003_alter_tenant_default_token_duration"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="impersonation_require_reason",
            field=models.BooleanField(
                default=True,
                help_text="Require administrators to provide a reason for impersonating a user.",
            ),
        ),
    ]
