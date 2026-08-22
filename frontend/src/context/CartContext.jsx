import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [subscriptionConfig, setSubscriptionConfig] = useState({
    orderType: 'onetime',
    deliveryDay: 'Monday',
    deliveryTimeSlot: 'morning',
    durationMonths: 2,
  });

  // Load cart from session storage on mount
  useEffect(() => {
    const savedCart = sessionStorage.getItem('cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
    const savedSubConfig = sessionStorage.getItem('subscriptionConfig');
    if (savedSubConfig) {
      setSubscriptionConfig(JSON.parse(savedSubConfig));
    }
  }, []);

  // Sync cart to session storage on changes
  const saveCart = (items) => {
    setCartItems(items);
    sessionStorage.setItem('cart', JSON.stringify(items));
  };

  const saveSubscriptionConfig = (config) => {
    setSubscriptionConfig(config);
    sessionStorage.setItem('subscriptionConfig', JSON.stringify(config));
  };

  const addToCart = (product, qty = 1, subConfig = null) => {
    const existingIndex = cartItems.findIndex(item => item.product.id === product.id);
    const quantity = parseFloat(qty);

    if (subConfig) {
      saveSubscriptionConfig(subConfig);
    }

    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += quantity;
      if (subConfig) {
        updated[existingIndex].isSubscription = subConfig.orderType === 'subscription';
        updated[existingIndex].subConfig = subConfig;
      }
      // Cap at available stock
      if (updated[existingIndex].quantity > parseFloat(product.quantity)) {
        updated[existingIndex].quantity = parseFloat(product.quantity);
      }
      saveCart(updated);
    } else {
      saveCart([...cartItems, { 
        product, 
        quantity, 
        isSubscription: subConfig?.orderType === 'subscription',
        subConfig: subConfig || null 
      }]);
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
      cartItems, addToCart, removeFromCart, updateQuantity, clearCart, 
      getCartTotal, getCartCount, subscriptionConfig, setSubscriptionConfig: saveSubscriptionConfig 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
