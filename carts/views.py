from django.shortcuts import get_object_or_404, redirect, render
from .utils import get_or_create_cart
#from .models import Cart

from .models import CartProducts
# Create your views here.

from products.models import Product

def cart(request):
    cart = get_or_create_cart(request)
    return render(request, 'carts/cart.html',{
        'cart':cart
        
    })
    
def add(request):
    cart= get_or_create_cart(request)
    product = Product.objects.get(pk=request.POST.get('product_id'))
    quantity = int(request.POST.get('quantity', 1))
    
    #cart.products.add(product, through_defaults=
     #                 {'quantity':quantity})
    
    cart_product = CartProducts.objects.create_or_update_quantity(cart=cart,
                                                                   product=product,
                                                                    quantity=quantity)   
    
    return render(request, 'carts/add.html',{
         'quantity': quantity,
         'cart_product':cart_product,
         'product':product
    })
    
def remove(request):#quitar un carrito
    cart= get_or_create_cart(request)
    product = get_object_or_404(Product, pk=request.POST.get('product_id'))
 
    
    cart.products.remove(product)
    
    return redirect('carts:cart')