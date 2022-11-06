from urllib.parse import urlparse
from django.urls import path

from . import views

app_name = 'biling_profiles'

urlpatterns = [
    path('', views.BilingProfileListView.as_view(), name='biling_profiles'),
    path('nuevo', views.create, name='create'),
]