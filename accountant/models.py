from django.db import models
from categories.models import Category
from orders.models import Order
from django.db.models import Sum
from django.db.models.signals import post_save
from django.dispatch import receiver

# Create your models here.

class Accoun(models.Model):
    categoria=models.ManyToManyField(Category,max_length=50)
    total = models.DecimalField(max_digits=8, decimal_places=2)
    total_sum = models.DecimalField(max_digits=10, decimal_places=2)


   # def __str__(self):
   #     return self.total
    
    
   
    #@receiver(post_save, sender=Order)
    #def update_total_sum(sender, instance, created, **kwargs):
    #    if created:
    #        total_sum = Order.objects.aggregate(total_sum=models.Sum('total'))['total_sum']
    #        accoun_obj = Accoun.objects.first()
    #        if accoun_obj:
    #            accoun_obj.total = total_sum
    #            accoun_obj.save()
    #        else:
    #            Accoun.objects.create(total=total_sum, total_sum=total_sum)