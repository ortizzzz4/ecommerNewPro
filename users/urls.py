from django.urls import path,include
from rest_framework import routers
from rest_framework.documentation import include_docs_urls
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView



app_name = 'users'# solo a al app de user

from . import views

routers = routers.DefaultRouter()
routers.register(r'users',views.UsersAPi,'users')


urlpatterns = [
     path('api/users/v1/',include(routers.urls)),\
     path('api/users/register/', views.RegisterView.as_view(), name='register'),
    path('api/users/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/users/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

