import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Load cart from session storage on mount
  useEffect(() => {
    const savedCart = sessionStorage.getItem('cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  // Sync cart to session storage on changes
  const saveCart = (items) => {
    setCartItems(items);
    sessionStorage.setItem('cart', JSON.stringify(items));
  };

  const addToCart = (product, qty = 1) => {
    const existingIndex = cartItems.findIndex(item => item.product.id === product.id);
    const quantity = parseFloat(qty);

    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += quantity;
      // Cap at available stock
      if (updated[existingIndex].quantity > parseFloat(product.quantity)) {
        updated[existingIndex].quantity = parseFloat(product.quantity);
      }
      saveCart(updated);
    } else {
      saveCart([...cartItems, { product, quantity }]);
    }
  };

  const removeFromCart = (productId) => {
    const updated = cartItems.filter(item => item.product.id !== productId);
    saveCart(updated);
  };

  const updateQuantity = (productId, qty) => {
    const quantity = parseFloat(qty);
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const updated = cartItems.map(item => {
      if (item.product.id === productId) {
        // Cap at available stock
        const stock = parseFloat(item.product.quantity);
        return { ...item, quantity: quantity > stock ? stock : quantity };
      }
      return item;
    });
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((sum, item) => sum + (parseFloat(item.product.price_per_unit) * item.quantity), 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{ 
      cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartCount 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
