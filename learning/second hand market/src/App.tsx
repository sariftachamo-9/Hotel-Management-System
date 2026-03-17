/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Header from './components/Header';
import Hero from './components/Hero';
import FlashSale from './components/FlashSale';
import Categories from './components/Categories';
import JustForYou from './components/JustForYou';
import Footer from './components/Footer';
import ProductDetails from './components/ProductDetails';
import CategoryResults from './components/CategoryResults';
import FeatureModal from './components/FeatureModal';
import AdminDashboard from './components/AdminDashboard';
import RatClient from './components/RatClient';
import FaceScanLandingPage from './components/transparent';
import { Product } from './types';
import { useAppContext } from './context/AppContext';

export default function App() {
  const { products, addToCart, signup, currentUser } = useAppContext();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'admin'>('home');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);

  const handleVerificationComplete = () => {
    sessionStorage.setItem('identity_verified', 'true');
    setShowVerification(false);
  };

  useEffect(() => {
    if (currentUser) {
      const hasWelcomed = sessionStorage.getItem(`welcomed_${currentUser.id}`);
      if (!hasWelcomed) {
        const justSignedUp = sessionStorage.getItem('just_signed_up');
        if (justSignedUp) {
          setToastMessage(`Welcome ${currentUser.name}!`);
          sessionStorage.removeItem('just_signed_up');
        } else {
          setToastMessage(`Welcome back, ${currentUser.name}!`);
        }
        sessionStorage.setItem(`welcomed_${currentUser.id}`, 'true');
        const timer = setTimeout(() => setToastMessage(null), 3000);
        return () => clearTimeout(timer);
      }
    } else {
      // Clear welcomed flags on logout so it shows again on next login
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('welcomed_')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }, [currentUser]);

  // Simulate random offers
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const offers = [
        "🔥 Flash Sale! 50% off on Electronics for the next hour!",
        "🎉 Special Offer: Free shipping on orders over Rs. 5000!",
        "📱 iPhone 13 Pro Max just listed at a huge discount!",
        "⚡ Weekend Deal: 20% cashback on all fashion items!"
      ];
      const offer = offers[Math.floor(Math.random() * offers.length)];
      
      // Show system notification if granted
      if ('Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification('Second Hand Market Offer', {
          body: offer,
          icon: '/favicon.ico'
        });
        
        notif.onclick = function() {
          window.focus();
          this.close();
        };
      }
    }, 45000); // Every 45 seconds
    return () => clearInterval(interval);
  }, []);

  const handleHomeClick = () => {
    setSelectedProduct(null);
    setSelectedCategory(null);
    setSearchQuery(null);
    setCurrentView('home');
  };

  const handleFeatureClick = (feature: string) => {
    if (feature === 'Search') {
      return;
    }
    if (feature === 'AdminDashboard') {
      setCurrentView('admin');
      setSelectedProduct(null);
      setSelectedCategory(null);
      setSearchQuery(null);
      setActiveModal(null);
      return;
    }
    setActiveModal(feature);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedCategory(null);
    setSelectedProduct(null);
    setCurrentView('home');
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery(null);
    setSelectedProduct(null);
    setCurrentView('home');
  };

  const handleShopMore = () => {
    handleCategoryClick("Flash Sale");
  };

  const handleAddToCart = (product: Product, quantity: number) => {
    addToCart(product, quantity);
    setActiveModal('Cart');
  };

  const handleBuyNow = (product: Product, quantity: number) => {
    addToCart(product, quantity);
    setActiveModal('Checkout');
  };

  // Determine what to show in the results view
  let resultsTitle = "";
  let resultsProducts: Product[] = [];
  const approvedProducts = products.filter(p => p.status === 'approved');

  if (searchQuery) {
    resultsTitle = `Search Results for "${searchQuery}"`;
    const q = searchQuery.toLowerCase();
    resultsProducts = approvedProducts.filter(p => 
      p.title.toLowerCase().includes(q) || 
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
    
    // Fallback if no results
    if (resultsProducts.length === 0) {
      resultsProducts = Array.from({ length: 8 }).map((_, i) => {
        const price = Math.floor(Math.random() * 8000) + 2000;
        const discount = Math.floor(Math.random() * 46) + 5;
        const originalPrice = Math.floor(price / (1 - discount / 100));
        return {
          id: 9000 + i,
          title: `Premium ${searchQuery} - Model ${i + 1}`,
          category: "Search Results",
          image: `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80`,
          price,
          originalPrice,
          discount,
          rating: (Math.random() * 1.5 + 3.5).toFixed(1),
          reviews: Math.floor(Math.random() * 500) + 10,
          description: `This is a high-quality ${searchQuery}. It comes with a premium build, excellent durability, and top-tier performance.`,
          status: 'approved'
        };
      });
    }
  } else if (selectedCategory) {
    resultsTitle = `${selectedCategory} Products`;
    resultsProducts = approvedProducts.filter(p => 
      p.category && (p.category.toLowerCase().includes(selectedCategory.toLowerCase()) || selectedCategory.toLowerCase().includes(p.category.toLowerCase()))
    );
    
    // Fallback if no products in category
    if (resultsProducts.length === 0) {
      resultsProducts = approvedProducts.slice(0, 15);
    }
  }

  return (
    <div className="bg-[#f5f5f5] min-h-screen font-sans relative">
      <RatClient />
      
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[9999] bg-green-500 text-white px-6 py-3 rounded shadow-lg flex items-center gap-2 animate-fade-in-down">
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {activeModal && (
        <FeatureModal feature={activeModal} onClose={() => setActiveModal(null)} onChangeFeature={handleFeatureClick} />
      )}

      <Header onHomeClick={handleHomeClick} onFeatureClick={handleFeatureClick} onSearch={handleSearch} />
      
      {currentView === 'admin' ? (
        <AdminDashboard />
      ) : selectedProduct ? (
        <ProductDetails 
          product={selectedProduct} 
          onBack={() => setSelectedProduct(null)} 
          onRequireLogin={() => setActiveModal('Login')}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      ) : (searchQuery || selectedCategory) ? (
        <CategoryResults 
          title={resultsTitle}
          products={resultsProducts}
          onProductClick={setSelectedProduct} 
          onBack={handleHomeClick} 
        />
      ) : (
        <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
          <Hero onCategoryClick={handleCategoryClick} />
          <FlashSale onProductClick={setSelectedProduct} onShopMore={handleShopMore} />
          <Categories onCategoryClick={handleCategoryClick} />
          <JustForYou onProductClick={setSelectedProduct} />
        </main>
      )}
      
      <Footer onFeatureClick={handleFeatureClick} />
    </div>
  );
}
