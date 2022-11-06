
from .models import Cart

def get_or_create_cart(request):
     #crear una sesion para el carrito
    user = request.user if request.user.is_authenticated else None
    cart_id = request.session.get('cart_id')
    cart = Cart.objects.filter(cart_id=cart_id).first() #filter list
    
    if cart is None:
        cart = Cart.objects.create(user=user)
       # request.session['cart_id'] = cart.cart_id
       
    if user and cart.user is  None:
        cart.user = user
        cart.save()
   
   
        
    request.session['cart_id'] = cart.cart_id
        
    #request.session['cart_id'] = '123' #Dic 
   # request.session.get('cart_id') #Int
    
   # request.session['cart_id'] = None
    return cart


def destroy_cart(request):
    request.session['cart_id'] = None