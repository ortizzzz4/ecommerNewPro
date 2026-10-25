import re
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from stripeAPI.customer import create_customer
from django.contrib.auth.models import AbstractUser

from orders.commo import OrderStatus

# Create your models here.

# para que no tenga problemas el administrador con el usuario
class User (AbstractUser):
    
    customer_id=models.CharField(max_length=100, blank=True, null=True)
    # PIN de 4 a 6 dígitos para entrar al punto de venta (se guarda con hash)
    pin_hash = models.CharField(max_length=128, blank=True, editable=False)
    # Número de carnet (DUI); sirve para iniciar sesión. Vacío = None para no chocar en unique
    carnet = models.CharField(max_length=20, unique=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        # El carnet se guarda solo con dígitos, igual que se busca al iniciar sesión
        from .permisos import normalizar_carnet
        self.carnet = normalizar_carnet(self.carnet) or None
        super().save(*args, **kwargs)

    def tiene_pin(self):
        return bool(self.pin_hash)

    def set_pin(self, pin):
        self.pin_hash = make_password(pin)

    def check_pin(self, pin):
        return bool(self.pin_hash) and check_password(pin, self.pin_hash)
    
    def get_full_name(self):
        return '{}-{}'.format(self.first_name, self.last_name)
    
    
    @property#Direccion principal del usuario en view shipping_addresses
    def shipping_address(self):
        return self.shippingaddress_set.filter(default=True).first()
    @property
    def biling_profile(self):
        return self.bilingprofile_set.filter( default=True).first() 
    
    @property
    def description(self):
        return 'Descrpcion para el usuario {}'.format(self.username)
    
    def has_customer(self):
        return self.customer_id is not None
    
    def create_customer_id(self):
        if not self.has_customer():
           customer = create_customer(self)
           self.customer_id = customer.id
           self.save()
        
    def has_biling_profiles(self):
        return self.bilingprofile_set.exists()
    
    #metodo para conocer si ya tiene una direccion principal
    def has_shipping_address(self):
        return self.shipping_address is not None
    
    def orders_completed(self):
        return self.order_set.filter(status=OrderStatus.COMPLETED).order_by('-id')
      
      # metodo para conocer si ya tiene una orden
    def has_shipping_addresses(self):
        return self.shippingaddress_set.exists()
    #metodo para conocer si ya tiene una orden
    @property
    def addresses(self):
        return self.shippingaddress_set.all()
    
    @property
    def biling_profiles(self):
        return self.bilingprofile_set.all().order_by('-default')

class Customer (User):
    class Meta:
        proxy=True
        
    def get_products(self):
        return []#self.product_set.all()
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField()