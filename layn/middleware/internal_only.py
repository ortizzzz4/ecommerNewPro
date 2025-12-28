from django.http import HttpResponseForbidden

import time
from datetime import datetime

class InternalOnlyMiddleware:
    INTERNAL_ALLOWED_IPS = ["127.0.0.1", "localhost", "::1"]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        # RUTA QUE QUIERES PROTEGER
        if path.startswith("/productos/v1/product/"):
            ip = request.META.get("REMOTE_ADDR")
            if ip not in self.INTERNAL_ALLOWED_IPS:
                return HttpResponseForbidden("Access restricted to internal network")

        return self.get_response(request)


class SimpleLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Timestamp antes de procesar
        start_time = time.time()
        
        response = self.get_response(request)
        
        # Calcular tiempo de respuesta
        duration = time.time() - start_time
        
        # Timestamp formateado
        timestamp = datetime.now().strftime("%d/%b/%Y %H:%M:%S")
        
        # Método con colores (opcional)
        method_colors = {
            'GET': '\033[94m',     # Azul
            'POST': '\033[92m',    # Verde
            'PUT': '\033[93m',     # Amarillo
            'DELETE': '\033[91m',  # Rojo
            'PATCH': '\033[95m',   # Magenta
        }
        reset = '\033[0m'
        
        color = method_colors.get(request.method, '')
        
        # Log ofuscado pero informativo
        endpoint = self._obfuscate_path(request.path)
        
        print(f"[{timestamp}] {color}{request.method:7}{reset} {endpoint:30} → {response.status_code} ({duration:.3f}s)")
        
        return response
    
    def _obfuscate_path(self, path):
        """Ofusca rutas sensibles"""
        obfuscations = {
            '/users/users/current/': '/auth/***',
            '/users/users/login/': '/login',
            '/productos/v1/product/': '/products',
            '/media/products/': '/media/***',
        }
        
        for original, replacement in obfuscations.items():
            if path.startswith(original):
                return replacement
        
        # Para otras rutas, mostrar solo el primer segmento
        parts = path.strip('/').split('/')
        if len(parts) > 2:
            return f"/{parts[0]}/***"
        
        return path
