from django.shortcuts import render

from django.db.models import Q

from django.views.generic.list import ListView
from django.views.generic.detail import DetailView
# Create your views here.
from .models import Product

class ProductListView(ListView):
       template_name = 'index.html'
       queryset = Product.objects.all().order_by('-id')
       paginate_by=2 # para que solo tenga dos productos o se visualisen 

       def get_context_data(self, **kwargs):
             context = super().get_context_data(**kwargs)
             context['message'] = 'Listado de productos'
             
             return context
class ProductDetailView(DetailView):
       model = Product
       template_name = 'products/product.html'
     #  queryset = Product.objects.all()

       def get_context_data(self, **kwargs):
             context = super().get_context_data(**kwargs)
       #      context['message'] = 'Detalle de Producto'
             return context
       
class ProductSearchListView(ListView):
      template_name = 'products/search.html'
      
      def get_queryset(self):
            filters = Q(title__icontains=self.query()) | Q(category__title__icontains=self.query())
            return Product.objects.filter(filters)
      def query(self):
            return self.request.GET.get('q')
      
      def get_context_data(self, **kwargs):
             context = super().get_context_data(**kwargs)
             context['query'] = self.query()
             return context
       