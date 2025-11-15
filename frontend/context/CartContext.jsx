// /home/ortiz/tienda/ecommerNewPro/frontend/context/CartContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    // Cargar del localStorage al iniciar
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // Guardar en localStorage cuando cambie el carrito
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      
      if (existingItem) {
        toast.success('✅ Cantidad actualizada en el carrito');
        return prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        toast.success('✅ Producto agregado al carrito');
        return [...prevItems, { ...product, quantity }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    toast.success('🗑️ Producto eliminado del carrito');
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart'); // Limpiar del localStorage también
    toast.success('🧹 Carrito vaciado');
  };

  // Nueva función: Completar compra y limpiar carrito
  const completeCheckout = async () => {
    try {
      // Aquí puedes agregar la lógica para enviar la orden al backend
      // const response = await crearOrden(cartItems);
      
      // Si todo sale bien, limpiar el carrito
      setCartItems([]);
      localStorage.removeItem('cart');
      toast.success('🎉 ¡Compra realizada con éxito!');
      return true;
    } catch (error) {
      toast.error('❌ Error al procesar la compra');
      return false;
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        completeCheckout,
        getCartTotal,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};