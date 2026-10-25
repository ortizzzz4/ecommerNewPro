import re

from rest_framework import serializers

from .models import Empresa

# Un nombre de dominio: etiquetas separadas por puntos, con al menos un punto (miempresa.com)
DOMINIO_VALIDO = re.compile(r'^(?=.{4,120}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$')


class EmpresaSerializer(serializers.ModelSerializer):
    faltantes_fe = serializers.SerializerMethodField()
    correo_clave_configurada = serializers.SerializerMethodField()

    class Meta:
        model = Empresa
        fields = [
            'nombre_comercial', 'razon_social', 'nit', 'nrc', 'giro', 'direccion', 'departamento',
            'municipio', 'telefono', 'correo', 'dominio', 'logo', 'pie_ticket',
            'correo_servidor', 'correo_puerto', 'correo_seguridad', 'correo_usuario', 'correo_clave',
            'correo_remitente', 'correo_nombre_remitente', 'correo_clave_configurada',
            'facturacion_electronica', 'ambiente', 'codigo_establecimiento', 'codigo_punto_venta',
            'datos_demo', 'faltantes_fe',
        ]
        extra_kwargs = {'correo_clave': {'write_only': True, 'required': False, 'allow_blank': True}}

    def get_faltantes_fe(self, obj):
        return obj.faltantes_fe()

    def get_correo_clave_configurada(self, obj):
        return bool(obj.correo_clave)

    def validate_correo_puerto(self, valor):
        if not 1 <= valor <= 65535:
            raise serializers.ValidationError('El puerto debe estar entre 1 y 65535.')
        return valor

    def validate_dominio(self, valor):
        # Se acepta "https://www.miempresa.com/" y se guarda como "miempresa.com"
        limpio = re.sub(r'^https?://', '', (valor or '').strip().lower()).split('/')[0]
        if limpio.startswith('www.'):
            limpio = limpio[4:]
        if limpio and not DOMINIO_VALIDO.match(limpio):
            raise serializers.ValidationError('El dominio no es válido. Ejemplo: miempresa.com')
        return limpio

    def update(self, instance, validated_data):
        # Una clave vacía significa "no cambiar": la contraseña guardada se conserva
        if not validated_data.get('correo_clave'):
            validated_data.pop('correo_clave', None)
        anterior = instance.datos_demo
        instance = super().update(instance, validated_data)
        self.resultado_demo = None
        if 'datos_demo' in validated_data and validated_data['datos_demo'] != anterior:
            from .demo import activar_datos_demo, quitar_datos_demo
            if instance.datos_demo:
                self.resultado_demo = {'accion': 'activados', 'creados': activar_datos_demo()}
            else:
                self.resultado_demo = {'accion': 'desactivados', **quitar_datos_demo()}
        return instance

    def validate(self, datos):
        # Para activar la factura electrónica no pueden faltar datos fiscales
        activar = datos.get('facturacion_electronica', getattr(self.instance, 'facturacion_electronica', False))
        if activar:
            temporal = Empresa(**{**{c: getattr(self.instance, c, '') for c in ['nit', 'nrc', 'razon_social', 'giro',
                                                                              'codigo_establecimiento',
                                                                              'codigo_punto_venta']}, **datos})
            faltan = temporal.faltantes_fe()
            if faltan:
                raise serializers.ValidationError(
                    {'facturacion_electronica': f'Para activar la factura electrónica falta: {", ".join(faltan)}.'}
                )
        return datos
