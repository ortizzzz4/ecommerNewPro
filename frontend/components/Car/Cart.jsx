// /home/ortiz/tienda/ecommerNewPro/frontend/components/Car/Cart.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { toast, Toaster } from 'sonner';

export function Cart() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, clearCart, getCartTotal, completeCheckout } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    setIsProcessing(true);
    
    // Aquí puedes agregar validaciones adicionales
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('⚠️ Debes iniciar sesión para completar la compra');
      navigate('/login');
      setIsProcessing(false);
      return;
    }

    // Procesar la compra
    const success = await completeCheckout();
    
    if (success) {
      // Redirigir a una página de confirmación o productos
      setTimeout(() => {
        navigate('/productos');
      }, 2000);
    }
    
    setIsProcessing(false);
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6 flex flex-col items-center justify-center">
        <Toaster position="top-center" richColors />
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">🛒 Tu carrito está vacío</h2>
          <p className="text-gray-400 mb-6">Agrega productos para continuar</p>
          <button
            onClick={() => navigate('/productos')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-semibold shadow-lg transition"
          >
            Ver productos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <Toaster position="top-center" richColors />
      
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-indigo-400">🛒 Mi Carrito</h1>
          <button
            onClick={clearCart}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
          >
            Vaciar carrito
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de productos */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map(item => (
              <div
                key={item.id}
                className="bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 border border-gray-700 flex gap-4"
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-green-400 font-bold">${item.price}</p>
                  
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                    >
                      -
                    </button>
                    <span className="px-4">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-col justify-between items-end">
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    🗑️
                  </button>
                  <p className="text-xl font-bold">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen del pedido */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl p-6 border border-gray-700 sticky top-6">
              <h2 className="text-2xl font-bold mb-4">Resumen del pedido</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${getCartTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío:</span>
                  <span>Gratis</span>
                </div>
                <hr className="border-gray-700" />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-green-400">${getCartTotal().toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className={`w-full px-6 py-3 rounded-2xl font-semibold shadow-lg transition ${
                  isProcessing 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isProcessing ? '⏳ Procesando...' : '💳 Proceder al pago'}
              </button>

              <button
                onClick={() => navigate('/productos')}
                className="w-full mt-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-semibold shadow-lg transition"
              >
                Seguir comprando
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}