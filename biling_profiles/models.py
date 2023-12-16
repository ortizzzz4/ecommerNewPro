from django.db import models

from stripeAPI.card import create_card
from users.models import User
# Create your models here.

class BilingProfileManager(models.Manager):
   
    def create_by_stripe_token(self, user, stripe_token ):
        if user.has_customer() and stripe_token:
            source=create_card(user, stripe_token)
          #  cvc_value = 1 if source.cvc_check == 'pass' else 0

            detalles =self.create(
                                card_id=source.id,
                               last4=source.last4,
                               token=stripe_token,
                               user =user,
                               brand=source.brand,
                             #  livemode=source.livemode,
                             #  type= source.type,
                               exp_month = source.exp_month,
                               exp_year=source.exp_year,
                               
                               default= not user.has_biling_profiles())

            return detalles


class BilingProfile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=50, null=False, blank=False)
    card_id= models.CharField(max_length=50, null=False, blank=False)
    last4 = models.CharField(max_length=50, null=False, blank=False)
    brand = models.CharField(max_length=10, null=False, blank=False)
    default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    livemode = models.BooleanField(default=False)
    type = models.CharField(max_length=50,null=False, blank=False)
    exp_month = models.IntegerField(default=0)
    exp_year =models.IntegerField(default=0)
    cvc= models.IntegerField(default=0)
   
    objects = BilingProfileManager()
   
    def __str__(self):
        return self.card_id