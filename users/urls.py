from django.urls import path,include
from rest_framework import routers
from rest_framework.documentation import include_docs_urls
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView



app_name = 'users'# solo a al app de user

from . import views
from .auth import LoginCarnetView, LoginPinView, LoginSerializer

routers = routers.DefaultRouter()
routers.register(r'users',views.UsersAPi,'users')


urlpatterns = [
    path('users/v1/',include(routers.urls)),\
    path('users/register/', views.RegisterView.as_view(), name='register'),
     
     
    path('users/login/', TokenObtainPairView.as_view(serializer_class=LoginSerializer), name='token_obtain_pair'),
    path('users/login-pin/', LoginPinView.as_view(), name='login_pin'),
    path('users/login-carnet/', LoginCarnetView.as_view(), name='login_carnet'),
    path('users/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/logout/', views.LogoutView.as_view(), name='logout'),
    
    path('users/current/', views.CurrentUserView.as_view(), name='current_user'),

]

