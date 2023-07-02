from django.db import models

# Create your models here.

class Accoun(models.Model):
    categoria=models.CharField(name="contaduria")
    

    def __str__(self):
        return 

    def __unicode__(self):
        return 

