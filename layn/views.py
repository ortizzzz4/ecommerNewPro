#from django.http import HttpResponse
#from itertools import product
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.shortcuts import redirect

from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth import logout
from django.contrib.auth import authenticate

#from django.contrib.auth.models import User
from users.models import User
from .forms import RegisterForm

from products.models import Product

def index(request):
      products = Product.objects.all().order_by('-id')
      return render(request, 'index.html',{
        'message':'Listado de productos',
        'title':'Productos',
        'products': products,
})


def login_view(request):
    if request.user.is_authenticated:
         return redirect('index')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
            
        user = authenticate(username=username, password=password)
        if user:                 
             login(request, user)
             messages.success(request, 'Bienvenido {}'.format(user.username))
           
             if request.GET.get('next'):
                 return HttpResponseRedirect(request.GET['next'])

             return redirect ('index')
           
           
        else:
              messages.error(request, 'Usuario o contraseña no validos')
         
    return render(request, 'users/login.html',{
    
  })
    
def logout_view(request):
      
  logout (request)
  messages.success(request, 'Session cerrada exitosamente ')
  return redirect('login')

def register(request):
     
      form = RegisterForm(request.POST or None)
      
      if request.method == 'POST' and form.is_valid():
         
         user =  form.save()
         if user: 
              login(request, user)
              messages.success(request, 'Usuario creado exitosamente')
              return redirect('index')
       
       #   form.save()
      #    messages.success(request, 'Usuario creado exitosamente')
       #   return redirect('login')
      
      return render(request, 'users/register.html',{
      'form':form
  })