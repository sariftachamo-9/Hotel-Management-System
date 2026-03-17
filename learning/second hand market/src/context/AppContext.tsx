import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { Product, User, Inquiry, CartItem } from '../types';
import { generateProducts } from '../data/products';

export interface AppOffer {
  discount: string;
  code: string;
  validUntil: string;
  isActive: boolean;
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  products: Product[];
  inquiries: Inquiry[];
  cart: CartItem[];
  appOffer: AppOffer;
  login: (email: string, pass: string) => User | null;
  googleLogin: (email: string) => User | null;
  signup: (name: string, email: string, pass: string, phone: string, role: 'buyer' | 'seller', verifiedPhoto?: string, documentType?: string, documentPhoto?: string, dob?: string) => User | null;
  logout: () => void;
  addProduct: (product: Omit<Product, 'id' | 'status' | 'sellerId'>) => void;
  updateProduct: (id: number, updates: Partial<Product>) => void;
  approveProduct: (id: number) => void;
  rejectProduct: (id: number) => void;
  addInquiry: (inquiry: Omit<Inquiry, 'id' | 'date' | 'status'>) => void;
  updateUserStatus: (id: string, status: 'approved' | 'rejected') => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  updateAppOffer: (offer: AppOffer) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('shm_currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('shm_users');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'admin1', name: 'Admin', email: 'admin@shm.com', password: 'admin', role: 'admin', status: 'approved' },
      { id: 'user1', name: 'John Doe', email: 'john@example.com', password: 'password123', role: 'buyer', status: 'approved' }
    ];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('shm_products');
    if (saved) return JSON.parse(saved);
    return generateProducts(100, 0).map(p => ({ ...p, status: 'approved' as const }));
  });

  const [inquiries, setInquiries] = useState<Inquiry[]>(() => {
    const saved = localStorage.getItem('shm_inquiries');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('shm_cart');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [appOffer, setAppOffer] = useState<AppOffer>(() => {
    const saved = localStorage.getItem('shm_appOffer');
    if (saved) return JSON.parse(saved);
    return {
      discount: '20%',
      code: 'APP20',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true
    };
  });

  // Persist state changes to localStorage
  useEffect(() => {
    localStorage.setItem('shm_currentUser', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('shm_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('shm_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('shm_inquiries', JSON.stringify(inquiries));
  }, [inquiries]);

  useEffect(() => {
    localStorage.setItem('shm_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('shm_appOffer', JSON.stringify(appOffer));
  }, [appOffer]);

  const updateAppOffer = (offer: AppOffer) => {
    setAppOffer(offer);
    
    // Broadcast offer to all users
    if (offer.isActive && offer.discount) {
      axios.post('/api/mail/broadcast-offer', {
        users: users.map(u => ({ email: u.email, name: u.name })),
        offerTitle: `Special ${offer.discount} Discount!`,
        offerDescription: `Use code <strong>${offer.code}</strong> before ${offer.validUntil} to get ${offer.discount} off your next purchase!`
      }).catch(err => console.error('Failed to broadcast offer:', err));
    }
  };

  const login = (email: string, pass: string) => {
    const user = users.find(u => u.email === email && u.password === pass);
    if (user && user.status !== 'rejected') {
      setCurrentUser(user);
      
      // Send welcome back email
      axios.post('/api/mail/welcome', {
        to: user.email,
        name: user.name,
        isNewUser: false
      }).catch(err => console.error('Failed to send welcome back email:', err));
      
      return user;
    }
    return null;
  };

  const googleLogin = (email: string) => {
    const user = users.find(u => u.email === email);
    if (user && user.status !== 'rejected') {
      setCurrentUser(user);
      
      // Send welcome back email
      axios.post('/api/mail/welcome', {
        to: user.email,
        name: user.name,
        isNewUser: false
      }).catch(err => console.error('Failed to send welcome back email:', err));
      
      return user;
    }
    return null;
  };

  const signup = (name: string, email: string, pass: string, phone: string, role: 'buyer' | 'seller', verifiedPhoto?: string, documentType?: string, documentPhoto?: string, dob?: string) => {
    if (users.find(u => u.email === email)) return null; // Email exists
    const newUser: User = {
      id: `user_${Date.now()}`,
      name,
      email,
      password: pass,
      phone,
      dob,
      role,
      verifiedPhoto,
      documentType,
      documentPhoto,
      status: 'pending'
    };
    setUsers([...users, newUser]);
    sessionStorage.setItem('just_signed_up', 'true');
    setCurrentUser(newUser);
    
    // Send welcome email
    axios.post('/api/mail/welcome', {
      to: newUser.email,
      name: newUser.name,
      isNewUser: true
    }).catch(err => console.error('Failed to send welcome email:', err));
    
    return newUser;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const addProduct = (productData: Omit<Product, 'id' | 'status' | 'sellerId'>) => {
    if (!currentUser) return;
    const newProduct: Product = {
      ...productData,
      id: Date.now(),
      status: 'pending',
      sellerId: currentUser.id
    };
    setProducts([newProduct, ...products]);
  };

  const updateProduct = (id: number, updates: Partial<Product>) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const approveProduct = (id: number) => {
    setProducts(products.map(p => p.id === id ? { ...p, status: 'approved' } : p));
  };

  const rejectProduct = (id: number) => {
    setProducts(products.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
  };

  const addInquiry = (inquiryData: Omit<Inquiry, 'id' | 'date' | 'status'>) => {
    const newInquiry: Inquiry = {
      ...inquiryData,
      id: `inq_${Date.now()}`,
      date: new Date().toISOString(),
      status: 'new'
    };
    setInquiries([newInquiry, ...inquiries]);
  };

  const updateUserStatus = (id: string, status: 'approved' | 'rejected') => {
    setUsers(users.map(u => u.id === id ? { ...u, status } : u));
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentUser?.id === id) {
      setCurrentUser({ ...currentUser, ...updates });
    }
  };

  const addToCart = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <AppContext.Provider value={{
      currentUser, users, products, inquiries, cart, appOffer,
      login, googleLogin, signup, logout, addProduct, updateProduct, approveProduct, rejectProduct, addInquiry, updateUserStatus, updateUser, addToCart, removeFromCart, clearCart, updateAppOffer
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
