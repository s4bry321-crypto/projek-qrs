import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OrderItem, MenuItem } from '../types';

interface CartContextType {
  cart: OrderItem[];
  addToCart: (item: MenuItem, quantity: number, notes: string) => void;
  updateQuantity: (menu_id: string, delta: number) => void;
  removeFromCart: (menu_id: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  tableNumber: string | null;
  setTableNumber: (table: string | null) => void;
  // Dipanggil sekali dari halaman menu tiap restoran (pakai seller.id-nya).
  // Kalau keranjang yang tersimpan ternyata milik restoran LAIN, otomatis dikosongkan
  // supaya meja/keranjang restoran A tidak kebawa ke restoran B di browser yang sama.
  ensureSellerContext: (sellerId: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [tableNumber, setTableNumber] = useState<string | null>(() => {
    return localStorage.getItem('tableNumber') || null;
  });
  const [cartSellerId, setCartSellerId] = useState<string | null>(() => {
    return localStorage.getItem('cartSellerId') || null;
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (tableNumber) {
      localStorage.setItem('tableNumber', tableNumber);
    } else {
      localStorage.removeItem('tableNumber');
    }
  }, [tableNumber]);

  useEffect(() => {
    if (cartSellerId) {
      localStorage.setItem('cartSellerId', cartSellerId);
    } else {
      localStorage.removeItem('cartSellerId');
    }
  }, [cartSellerId]);

  const ensureSellerContext = useCallback((sellerId: string) => {
    setCartSellerId(prev => {
      if (prev && prev !== sellerId) {
        setCart([]);
        setTableNumber(null);
      }
      return sellerId;
    });
  }, []);

  const addToCart = (item: MenuItem, quantity: number, notes: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.menu_id === item.id);
      if (existing) {
        return prev.map(i => 
          i.menu_id === item.id 
            ? { ...i, jumlah: i.jumlah + quantity, catatan: notes || i.catatan }
            : i
        );
      }
      return [...prev, { menu_id: item.id, nama: item.nama, harga: item.harga, jumlah: quantity, catatan: notes }];
    });
  };

  const updateQuantity = (menu_id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.menu_id === menu_id) {
        const newQty = Math.max(1, i.jumlah + delta);
        return { ...i, jumlah: newQty };
      }
      return i;
    }));
  };

  const removeFromCart = (menu_id: string) => {
    setCart(prev => prev.filter(i => i.menu_id !== menu_id));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((acc, item) => acc + item.jumlah, 0);
  const totalPrice = cart.reduce((acc, item) => acc + (item.harga * item.jumlah), 0);

  return (
    <CartContext.Provider value={{
      cart, addToCart, updateQuantity, removeFromCart, clearCart, totalItems, totalPrice, tableNumber, setTableNumber, ensureSellerContext
    }}>
      {children}
    </CartContext.Provider>
  );
};
