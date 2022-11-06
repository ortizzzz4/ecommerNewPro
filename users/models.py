import re
from django.db import models
from stripeAPI.customer import create_customer
from django.contrib.auth.models import AbstractUser

from orders.commo import OrderStatus

# Create your models here.

# para que no tenga problemas el administrador con el usuario
class User (AbstractUser):
    
    customer_id=models.CharField(max_length=100, blank=True, null=True)
    
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