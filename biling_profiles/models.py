from django.db import models

from stripeAPI.card import create_card
from users.models import User
# Create your models here.

class BilingProfileManager(models.Manager):
   
    def create_by_stripe_token(self, user, stripe_token ):
        if user.has_customer() and stripe_token:
            source=create_card(user, stripe_token)
            
            return self.create(card_id=source.id,
                               last4=source.last4,
                               token=stripe_token,
                               user =user,
                               brand=source.brand,
                               default= not user.has_biling_profiles())



class BilingProfile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=50, null=False, blank=False)
    card_id= models.CharField(max_length=50, null=False, blank=False)
    last4 = models.CharField(max_length=4, null=False, blank=False)
    brand = models.CharField(max_length=10, null=False, blank=False)
    default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
   
   
    objects = BilingProfileManager()
   
    def __str__(self):
        return self.card_id