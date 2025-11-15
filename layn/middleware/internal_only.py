from django.http import HttpResponseForbidden

class InternalOnlyMiddleware:
    INTERNAL_ALLOWED_IPS = ["127.0.0.1", "localhost", "::1"]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        # RUTA QUE QUIERES PROTEGER
        if path.startswith("/productos/api/v1/product/"):
            ip = request.META.get("REMOTE_ADDR")
            if ip not in self.INTERNAL_ALLOWED_IPS:
                return HttpResponseForbidden("Access restricted to internal network")

        return self.get_response(request)
