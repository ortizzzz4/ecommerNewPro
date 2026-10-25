import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  clearTiendaCarrito,
  getTiendaCarrito,
  removeTiendaCartItem,
  setTiendaCartItem,
} from '../api/ApisCrud';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider');
  }
  return context;
};

const isLoggedIn = () => Boolean(localStorage.getItem('access_token'));

const readLocalCart = () => {
  try {
    return JSON.parse(localStorage.getItem('cart')) || [];
  } catch {
    return [];
  }
};

// Con sesión el carrito vive en el servidor; sin sesión, en localStorage
export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => (isLoggedIn() ? [] : readLocalCart()));
  const [serverTotals, setServerTotals] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn()) return;
    const { data } = await getTiendaCarrito();
    setItems(data.items);
    setServerTotals({ subtotal: Number(data.subtotal), total: Number(data.total) });
  }, []);

  // Al iniciar sesión, lo que había en el carrito local pasa al del servidor
  useEffect(() => {
    if (!isLoggedIn()) return;

    const localItems = readLocalCart();
    const sync = async () => {
      setLoading(true);
      try {
        if (localItems.length > 0) {
          const { data } = await getTiendaCarrito();
          await Promise.all(localItems.map(item => {
            const current = data.items.find(i => i.id === item.id)?.quantity || 0;
            return setTiendaCartItem(item.id, current + item.quantity);
          }));
          localStorage.removeItem('cart');
        }
        await refreshCart();
      } catch {
        toast.error('No se pudo cargar tu carrito');
      } finally {
        setLoading(false);
      }
    };
    sync();
  }, [refreshCart]);

  // Sin sesión, guarda el carrito localmente
  useEffect(() => {
    if (!isLoggedIn()) {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items]);

  // Devuelve true si el servidor aceptó el cambio
  const runOnServer = async (request) => {
    setLoading(true);
    try {
      await request();
      await refreshCart();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo actualizar el carrito');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product, quantity = 1) => {
    if (isLoggedIn()) {
      const current = items.find(item => item.id === product.id)?.quantity || 0;
      if (await runOnServer(() => setTiendaCartItem(product.id, current + quantity))) {
        toast.success('Producto agregado al carrito');
      }
      return;
    }

    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        toast.success('Cantidad actualizada en el carrito');
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      toast.success('Producto agregado al carrito');
      return [...prevItems, { ...product, quantity }];
    });
  };

  const removeFromCart = async (productId) => {
    if (isLoggedIn()) {
      await runOnServer(() => removeTiendaCartItem(productId));
    } else {
      setItems(prevItems => prevItems.filter(item => item.id !== productId));
    }
    toast.success('Producto eliminado del carrito');
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    if (isLoggedIn()) {
      await runOnServer(() => setTiendaCartItem(productId, quantity));
      return;
    }
    setItems(prevItems =>
      prevItems.map(item => (item.id === productId ? { ...item, quantity } : item))
    );
  };

  const clearCart = async () => {
    if (isLoggedIn()) {
      await runOnServer(() => clearTiendaCarrito());
    } else {
      setItems([]);
    }
    toast.success('Carrito vaciado');
  };

  const getCartTotal = () =>
    items.reduce((total, item) => total + Number(item.price) * item.quantity, 0);

  const getCartCount = () => items.reduce((count, item) => count + item.quantity, 0);

  const subtotal = getCartTotal();
  const totals = serverTotals || { subtotal, total: subtotal };

  return (
    <CartContext.Provider
      value={{
        cartItems: items,
        totals,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
        getCartTotal,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
