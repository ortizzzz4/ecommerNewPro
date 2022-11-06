"""
Django settings for layn project.

Generated by 'django-admin startproject' using Django 4.1.

For more information on this file, see
https://docs.djangoproject.com/en/4.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/4.1/ref/settings/
"""

from distutils.command.config import config
import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-(n@7a$#*3esipr)z(_^^7z#r8=mp3dozb%_05nn1ds0q2^6j1h'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = ['localhost' ,'127.0.0.1','webpersonal.pythonanywhere.com']


# Application definition

INSTALLED_APPS = [
    'users',
    'carts',
    'orders',
    'charges',
    'products',
    'categories',
    'promo_code',
    'biling_profiles',
    'shipping_addresses',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
   # 'whitenoise.middleware.WhiteNoiseMiddleware',
    
    ]

ROOT_URLCONF = 'layn.urls'

#para hacer uso de login personalizado
AUTH_USER_MODEL='users.User'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': ['templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                 
            ],
        
        },
    },
]

WSGI_APPLICATION = 'layn.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
 

#import dj_database_url
#from decouple import config

#DATABASES = {
 #   'default': dj_database_url.config(
  #      default=config('DATABASE_URL')
   # )
#}

#SECRET_KEY = os.environ.get('SECRET_KEY', default='otra_llave_supersecreta')


# Update database configuration with $DATABASE_URL.



# Password validation
# https://docs.djangoproject.com/en/4.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'America/El_Salvador'

USE_I18N = True

USE_TZ = True

#from decouple import config

#EMAIL_HOST = 'smtp.googlemail.com'
#EMAIL_PORT = 587
#EMAIL_HOST_USER = 'luisenriquehernandezortiz@gmail.com'
#EMAIL_HOST_PASSWORD = config('USER_MAIL_PASSWORD')
#EMAIL_USER_TLS = True

STRIPE_PUBLIC_KEY='pk_test_51LhPazDmLls9is6ndZQlW4OyoGuxWt6ANvK6JH302H4TSyO7utKySd0FzVW4PiWoTIF7qxjNQI8maSNeHN0s3zer003KXnQ1TO'
STRIPE_PRIVATE_KEY='sk_test_51LhPazDmLls9is6ntkwpzoDA0ECW0864mz7QzR8PIIAOsyDlRMJnQyuEfV3XFVSLkHg3Spli38EOV78mfmeuibhm00No7QD3fC'


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.1/howto/static-files/

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

STATIC_URL = 'static/'

#archivo static
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'



STATICFILES_DIRS = (
    os.path.join(BASE_DIR, 'static'),
    )

MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
# https://docs.djangoproject.com/en/4.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
