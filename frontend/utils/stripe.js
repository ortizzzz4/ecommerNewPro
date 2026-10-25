// Carga Stripe.js una sola vez y devuelve la instancia con la clave pública
let stripePromise = null;

export function loadStripe(publicKey) {
  if (!stripePromise) {
    stripePromise = new Promise((resolve, reject) => {
      const init = () => resolve(window.Stripe(publicKey));

      if (window.Stripe) {
        init();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = init;
      script.onerror = () => {
        stripePromise = null;
        reject(new Error('No se pudo cargar Stripe'));
      };
      document.head.appendChild(script);
    });
  }
  return stripePromise;
}
