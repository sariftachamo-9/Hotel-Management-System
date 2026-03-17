import React, { useState } from 'react';
import { Search, ShoppingCart, User as UserIcon, LogOut, Menu } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface HeaderProps {
  onHomeClick?: () => void;
  onFeatureClick?: (feature: string) => void;
  onSearch?: (query: string) => void;
}

export default function Header({ onHomeClick, onFeatureClick, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, logout } = useAppContext();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <header className="bg-white sticky top-0 z-50 shadow-sm">
      {/* Top Bar (Desktop) */}
      <div className="bg-[#f5f5f5] text-[11px] text-gray-600 hidden md:block">
        <div className="max-w-[1200px] mx-auto px-4 flex justify-between items-center h-6">
          <div className="flex space-x-4">
            <a href="#" onClick={(e) => { e.preventDefault(); onFeatureClick?.('Save More on App'); }} className="hover:text-[#f85606] text-[#f85606]">Save More on App</a>
            <a href="#" onClick={(e) => { e.preventDefault(); if (currentUser) { onFeatureClick?.('Sell on Second Hand Market'); } else { onFeatureClick?.('LoginOnly'); } }} className="hover:text-[#f85606]">Sell on Second Hand Market</a>
            <a href="#" onClick={(e) => { e.preventDefault(); if (currentUser) { onFeatureClick?.('Customer Care'); } else { onFeatureClick?.('LoginOnly'); } }} className="hover:text-[#f85606]">Customer Care</a>
            <a href="#" onClick={(e) => { e.preventDefault(); if (currentUser) { onFeatureClick?.('Track my Order'); } else { onFeatureClick?.('LoginOnly'); } }} className="hover:text-[#f85606]">Track my Order</a>
          </div>
          <div className="flex space-x-4 items-center">
            {currentUser ? (
              <>
                <span className="text-gray-800 font-medium flex items-center gap-1">
                  <UserIcon size={12} /> Hi, {currentUser.name}
                </span>
                <a href="#" onClick={(e) => { e.preventDefault(); onFeatureClick?.('Profile'); }} className="hover:text-[#f85606] font-medium">Profile</a>
                <a href="#" onClick={(e) => { e.preventDefault(); onFeatureClick?.('Identity Verification'); }} className="hover:text-[#2563eb] text-[#2563eb] font-bold">Verify Identity</a>
                {currentUser.role === 'admin' && (
                  <a href="#" onClick={(e) => { e.preventDefault(); onFeatureClick?.('AdminDashboard'); }} className="hover:text-[#f85606] font-bold text-[#f85606]">Admin Dashboard</a>
                )}
                <button onClick={logout} className="hover:text-[#f85606] flex items-center gap-1">
                  <LogOut size={12} /> Logout
                </button>
              </>
            ) : (
              <>
                <a href="#" onClick={(e) => { e.preventDefault(); onFeatureClick?.('Login'); }} className="hover:text-[#f85606]">Login</a>
                <a href="#" onClick={(e) => { e.preventDefault(); onFeatureClick?.('Signup'); }} className="hover:text-[#f85606]">Signup</a>
              </>
            )}
            <div className="relative group cursor-pointer">
              <span className="hover:text-[#f85606] flex items-center gap-1">Language: EN</span>
              <div className="absolute right-0 top-full mt-1 bg-white shadow-md border border-gray-100 rounded hidden group-hover:block z-50 w-24">
                <div className="px-4 py-2 text-gray-800 hover:bg-gray-50 hover:text-[#f85606]">English</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        
        {/* Mobile Top Row: Logo + Cart + Menu */}
        <div className="flex w-full md:w-auto items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onHomeClick?.(); }} 
              className="text-2xl md:text-3xl font-bold text-[#f85606] tracking-tighter"
            >
              Second Hand Market
            </a>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-4">
            <a href="#" onClick={(e) => { e.preventDefault(); onFeatureClick?.('Cart'); }} className="text-gray-700 hover:text-[#f85606] relative">
              <ShoppingCart size={22} />
              <span className="absolute -top-2 -right-2 bg-[#f85606] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                0
              </span>
            </a>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-700 hover:text-[#f85606]">
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 w-full max-w-[700px]">
          <form onSubmit={handleSearch} className="flex w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in Second Hand Market"
              className="w-full px-3 md:px-4 py-2 bg-gray-100 border border-transparent focus:bg-white focus:border-[#f85606] outline-none rounded-l-sm text-sm md:text-base"
            />
            <button type="submit" className="bg-[#f85606] text-white px-4 md:px-6 py-2 rounded-r-sm hover:bg-[#d04805] transition-colors">
              <Search size={20} />
            </button>
          </form>
        </div>

        {/* Desktop Cart & App */}
        <div className="hidden md:flex flex-shrink-0 items-center gap-6">
          <a href="#" onClick={(e) => { e.preventDefault(); onFeatureClick?.('Cart'); }} className="text-gray-700 hover:text-[#f85606] relative">
            <ShoppingCart size={24} />
            <span className="absolute -top-2 -right-2 bg-[#f85606] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              0
            </span>
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); onFeatureClick?.('Save More on App'); }} className="text-gray-700 hover:text-[#f85606]">
            <img src="https://picsum.photos/seed/darazapp/140/40" alt="App" className="h-10 rounded" referrerPolicy="no-referrer" />
          </a>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-3 shadow-lg absolute w-full left-0 z-40">
          {currentUser ? (
            <div className="pb-3 border-b border-gray-100">
              <div className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                <UserIcon size={16} /> Hi, {currentUser.name}
              </div>
              <div className="flex flex-col gap-2 pl-6">
                <a href="#" onClick={(e) => { e.preventDefault(); onFeatureClick?.('Profile'); setMobileMenuOpen(false); }} className="text-gray-600 text-sm">My Profile</a>
                {currentUser.role === 'admin' && (
                  <a href="#" onClick={(e) => { e.preventDefault(); onFeatureClick?.('AdminDashboard'); setMobileMenuOpen(false); }} className="text-[#f85606] font-bold text-sm">Admin Dashboard</a>
                )}
                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="text-gray-600 text-sm text-left flex items-center gap-1">
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 pb-3 border-b border-gray-100">
              <button onClick={() => { onFeatureClick?.('Login'); setMobileMenuOpen(false); }} className="flex-1 bg-gray-100 text-gray-800 py-2 rounded text-sm font-medium">Login</button>
              <button onClick={() => { onFeatureClick?.('Signup'); setMobileMenuOpen(false); }} className="flex-1 bg-[#f85606] text-white py-2 rounded text-sm font-medium">Sign Up</button>
            </div>
          )}
          <div className="flex flex-col gap-3 pt-1">
            <a href="#" onClick={(e) => { e.preventDefault(); onFeatureClick?.('Save More on App'); setMobileMenuOpen(false); }} className="text-gray-600 text-sm">Save More on App</a>
            <a href="#" onClick={(e) => { e.preventDefault(); if (currentUser) { onFeatureClick?.('Sell on Second Hand Market'); } else { onFeatureClick?.('LoginOnly'); } setMobileMenuOpen(false); }} className="text-gray-600 text-sm">Sell on Second Hand Market</a>
            <a href="#" onClick={(e) => { e.preventDefault(); if (currentUser) { onFeatureClick?.('Customer Care'); } else { onFeatureClick?.('LoginOnly'); } setMobileMenuOpen(false); }} className="text-gray-600 text-sm">Customer Care</a>
            <a href="#" onClick={(e) => { e.preventDefault(); if (currentUser) { onFeatureClick?.('Track my Order'); } else { onFeatureClick?.('LoginOnly'); } setMobileMenuOpen(false); }} className="text-gray-600 text-sm">Track my Order</a>
          </div>
        </div>
      )}
    </header>
  );
}
