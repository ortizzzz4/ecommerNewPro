from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import get_template
from django.urls import reverse

class Mail:
    @staticmethod
    def get_absolute_url(url):
        if settings.DEBUG:
            return 'http://localhost:8000{}'.format(
                reverse(url)
            )
    
    
    
    def send_complete_order(order, user):
        subject = 'Tu pedido ha sido completado'
        template = get_template('orders/mail/complete.html')
        content = template.render({
            'user': user,
       })
        
        message = EmailMultiAlternatives(subject,'Mensaje importante',
                                        settings.EMAIL_HOST_USER,
                                        [user.email])
        
        message.attach_alternative(content, 'text/html')
        message.send()