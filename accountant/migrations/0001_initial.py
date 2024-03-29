# Generated by Django 4.2.5 on 2023-11-12 23:42

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('categories', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Accoun',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('total', models.DecimalField(decimal_places=2, max_digits=8)),
                ('total_sum', models.DecimalField(decimal_places=2, max_digits=10)),
                ('categoria', models.ManyToManyField(max_length=50, to='categories.category')),
            ],
        ),
    ]
