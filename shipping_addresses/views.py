from django.http import HttpResponseRedirect
from django.urls import reverse_lazy
from django.views.generic.edit import UpdateView #actualizar un registro
from django.views.generic.edit import DeleteView #eliminar un registro
from django.contrib import messages # se aplica para mostrar mensajes solo en funciones
from django.views.generic import ListView
from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin # restrinción de acceso a usuarios no logueados
from django.contrib.messages.views import SuccessMessageMixin#se aplica solo para las clases para enviar un mensaje del servidor al cliente

from django.urls import reverse_lazy

from django.shortcuts import reverse
from carts.utils import get_or_create_cart
from orders.utils import get_or_create_order



from .models import ShippingAddress

from .forms import ShippingAddressesForm

#Si es una clase, se debe heredar de LoginRequiredMixin,siendo la primera en clase padre
class ShippingAddressListView(LoginRequiredMixin,  ListView):
    login_url = 'login'
    model= ShippingAddress
    template_name= 'shipping_addresses/shipping_addresses.html'

    def get_queryset(self):
        return ShippingAddress.objects.filter(user=self.request.user).order_by('-default')#obtner todas las direeciones
#clase para editar direcciones
class ShippingAddressUpdateView(LoginRequiredMixin, SuccessMessageMixin,UpdateView):
    login_url='login'
    model = ShippingAddress
    form_class= ShippingAddressesForm
    template_name = 'shipping_addresses/update.html'
    success_message = 'Dirección actualizada correctamente'
    
    # se aplica cuando se actualiza un formulario o datos
    def get_success_url(self):
        return reverse('shipping_addresses:shipping_addresses')
    
    def dispatch(self, request, *args, **kwargs):#el metodo dispatch se aplica para usuarios que no les pertenece la direcccion
        if request.user.id != self.get_object().user_id:
            return redirect('carts:cart')
        return super( ShippingAddressUpdateView, self).dispatch(request, *args, **kwargs)

class ShippingAddressDeleteView(LoginRequiredMixin,DeleteView):
    login_url='login'
    model= ShippingAddress
    template_name= 'shipping_addresses/delete.html'
    success_url= reverse_lazy('shipping_addresses:shipping_addresses')#redirije al index asignado
   
    def  dispatch(self, request, *args, **kwargs):
        if self.get_object().default:
            return redirect('shipping_addresses:shipping_addresses')
        
        if request.user.id != self.get_object().user_id:
            return redirect('carts:cart')
        
        
        if self.get_object().has_orders():
            return redirect('shipping_addresses:shipping_addresses')
        
        return super(ShippingAddressDeleteView, self).dispatch(request, *args, **kwargs)
   

#si es una funcion de vista se usa el decorador login_required
@login_required(login_url='login')#decorador para que solo los usuarios logeados puedan acceder a esta vista
def create(request):#crear una direccion con el usuario logeado
    form = ShippingAddressesForm(request.POST or None)
    
    if request.method == 'POST' and form.is_valid():
        shipping_address= form.save(commit=False)#instancia 
        shipping_address.user= request.user        
        shipping_address.default = not request.user.has_shipping_address() #si no hay direcciones, la primera sera la predeterminada
        
        shipping_address.save()
        
        if request.GET.get('next'):
            if request.GET['next'] == reverse('orders:address'):
                   cart = get_or_create_cart(request)
                   order = get_or_create_order(cart, request)
                   
                   order.update_shipping_address(shipping_address)
                    
                   return HttpResponseRedirect(request.GET['next'])
        
        
        messages.success(request, 'Dirección creada exitosamente') # se aplica sol
        return redirect('shipping_addresses:shipping_addresses')
    
    return render(request, 'shipping_addresses/create.html',{
        'form': form
    })



@login_required(login_url='login')
def default(request, pk):
    shipping_address=get_object_or_404(ShippingAddress, pk=pk)
    
    if request.user.id != shipping_address.user_id:
        return redirect('carts:cart')
    #obtner la antigua direccion, con la condiccion si ya tiene una direccion se actualiza
    if request.user.has_shipping_address():
        request.user.shipping_address.update_default()#metodo para actualizar la direccion por defecto
    
    shipping_address.update_default(True)#Despues de las actulizaciones lo redirije a la vista de direcciones
    
    return redirect('shipping_addresses:shipping_addresses')