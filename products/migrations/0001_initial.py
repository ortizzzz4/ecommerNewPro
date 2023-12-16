# Generated by Django 4.2.6 on 2023-10-31 02:58

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=50)),
                ('description', models.TextField()),
                ('price', models.DecimalField(decimal_places=2, default=0.0, max_digits=8)),
                ('slug', models.SlugField(unique=True)),
                ('image', models.ImageField(upload_to='products/')),
                ('create_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
