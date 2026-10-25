from email.mime import image
import uuid
from django.db import models
from django.utils.text import slugify
from django.db.models.signals import pre_save

# Create your models here.
class Product(models.Model):
    TIPO_CHOICES = [
        ('bien', 'Bien (inventariable)'),
        ('servicio', 'Servicio (no descuenta inventario)'),
        ('combo', 'Combo (se vende junto, descuenta sus componentes)'),
        ('kit', 'Kit (armado a partir de componentes)'),
    ]

    title = models.CharField(max_length=50)
    description = models.TextField()
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0.0)
    slug = models.SlugField(unique=True, blank=False, null=False)
    image = models.ImageField(upload_to='products/', null=False, blank=False)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default='bien')
    codigo_barras = models.CharField(max_length=50, unique=True, null=True, blank=True)
    stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # Dónde se puede usar el producto
    visible_pos = models.BooleanField(default=True, verbose_name='visible en POS')
    visible_ventas = models.BooleanField(default=True, verbose_name='visible en ventas')
    visible_compras = models.BooleanField(default=True, verbose_name='visible en compras')
    visible_tienda = models.BooleanField(default=True, verbose_name='visible en tienda')
    es_demo = models.BooleanField(default=False, editable=False, help_text='Creado por los datos de demostración')
    create_at = models.DateTimeField(auto_now_add=True)

    @property
    def descuenta_inventario(self):
        return self.tipo == 'bien'
    
    #def save(self, *args, **kwargs):
     #   self.slug = slugify(self.title)
    #    super(Product, self).save(*args, **kwargs)
        
    def __str__(self):
        return self.title
    
def set_slug(sender, instance, *args, **kwargs): #callback
    if instance.title and not instance.slug:
        slug = slugify(instance.title)

        while Product.objects.filter(slug=slug).exists():
            slug = slugify(
                '{}-{}'.format(instance.title, str(uuid.uuid4())[:8] )
            )

        instance.slug = slug

pre_save.connect(set_slug, sender=Product)