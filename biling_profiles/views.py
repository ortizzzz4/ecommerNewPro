from django.contrib import messages
from django.shortcuts import render
from django.conf import settings
from django.contrib.auth.decorators import login_required

from .models import BilingProfile
# Create your views here.

from django.views.generic.list import ListView
from django.contrib.auth.mixins import LoginRequiredMixin


class BilingProfileListView(LoginRequiredMixin,ListView ):
    login_url = 'login'
    template_name = 'biling_profiles/biling_profiles.html'
    
    
    def get_queryset(self):
        return self.request.user.biling_profiles
    
    
    
@login_required(login_url='login')
def create(request):
    
    if request.method == 'POST':
        if request.POST.get('stripeToken'):
            
            if not request.user.has_customer():
                request.user.create_customer_id()
            stripe_token = request.POST['stripeToken']
            biling_profiles = BilingProfile.objects.create_by_stripe_token(request.user, stripe_token)
            
            if biling_profiles:
                messages.success(request, 'Tarjeta agregada correctamente')
            
    return render(request, 'biling_profiles/create.html',{
        'stripe_public_key': settings.STRIPE_PUBLIC_KEY
        
    })