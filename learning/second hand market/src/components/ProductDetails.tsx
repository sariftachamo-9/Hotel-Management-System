import { Star, ChevronRight, Home, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Product } from '../types';
import { useAppContext } from '../context/AppContext';

interface ProductDetailsProps {
  product: Product;
  onBack: () => void;
  onRequireLogin: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
}

export default function ProductDetails({ product, onBack, onRequireLogin, onAddToCart, onBuyNow }: ProductDetailsProps) {
  const { currentUser } = useAppContext();
  const [quantity, setQuantity] = useState(1);

  const handleAction = (action: 'cart' | 'buy') => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (action === 'cart') {
          onAddToCart(product, quantity);
        } else {
          onBuyNow(product, quantity);
        }
      },
      (error) => {
        alert('Location access is required to buy products. Please allow location access.');
      }
    );
  };

  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-12">
      {/* Breadcrumb */}
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
        <button onClick={onBack} className="hover:text-[#f85606] flex items-center gap-1">
          <Home size={14} /> Home
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-800 truncate">{product.title}</span>
      </div>

      <div className="max-w-[1200px] mx-auto px-4">
        <div className="bg-white p-4 sm:p-6 rounded-sm shadow-sm flex flex-col md:flex-row gap-8">
          {/* Image Gallery */}
          <div className="w-full md:w-[350px] lg:w-[400px] flex-shrink-0">
            <img 
              src={product.image} 
              alt={product.title} 
              className="w-full aspect-square object-cover rounded-sm border border-gray-100"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Product Info */}
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl text-gray-800 font-medium mb-3">
              {product.title}
            </h1>
            
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-1">
                <div className="flex text-[#faca51]">
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" className="opacity-50" />
                </div>
                <span className="text-sm text-blue-500 hover:underline cursor-pointer">
                  {product.rating} Ratings
                </span>
              </div>
              <div className="text-gray-300">|</div>
              <span className="text-sm text-gray-500">{product.reviews} Answered Questions</span>
              {product.location && (
                <>
                  <div className="text-gray-300">|</div>
                  <span className="text-sm text-gray-500 flex items-center gap-1">📍 {product.location}</span>
                </>
              )}
            </div>

            <div className="mb-6">
              <div className="text-3xl text-[#f85606] font-medium mb-1">
                Rs. {product.price.toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 line-through text-sm">
                  Rs. {product.originalPrice.toLocaleString()}
                </span>
                <span className="text-gray-800 text-sm font-medium">
                  -{product.discount}%
                </span>
              </div>
            </div>

            <div className="mb-6 flex items-center gap-4">
              <span className="text-gray-500 text-sm w-20">Quantity</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600 rounded-sm">
                  <Minus size={16} />
                </button>
                <span className="text-gray-800">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600 rounded-sm">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => handleAction('buy')} className="flex-1 bg-[#2abbe8] hover:bg-[#25a5d8] text-white py-3 rounded-sm font-medium transition-colors">
                Buy Now
              </button>
              <button onClick={() => handleAction('cart')} className="flex-1 bg-[#f85606] hover:bg-[#d04805] text-white py-3 rounded-sm font-medium transition-colors flex items-center justify-center gap-2">
                <ShoppingCart size={18} /> Add to Cart
              </button>
            </div>
          </div>

          {/* Delivery Info (Right Sidebar) */}
          <div className="w-full md:w-[250px] lg:w-[300px] bg-gray-50 p-4 rounded-sm border border-gray-100 h-fit">
            <h3 className="text-sm text-gray-500 font-medium mb-4">Delivery</h3>
            <div className="space-y-4 text-sm text-gray-800">
              <div className="flex gap-3">
                <div className="w-5 flex justify-center">📍</div>
                <div>
                  <p>Standard Delivery</p>
                  <p className="text-xs text-gray-500 mt-1">3 - 5 day(s)</p>
                </div>
                <div className="ml-auto font-medium">Rs. 100</div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 flex justify-center">💵</div>
                <div>Cash on Delivery Available</div>
              </div>
            </div>

            <h3 className="text-sm text-gray-500 font-medium mt-6 mb-4 pt-4 border-t border-gray-200">Service</h3>
            <div className="space-y-4 text-sm text-gray-800">
              <div className="flex gap-3">
                <div className="w-5 flex justify-center">↩️</div>
                <div>
                  <p>14 days free & easy return</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 flex justify-center">🛡️</div>
                <div>
                  <p>Warranty not available</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        <div className="mt-4 bg-white p-4 sm:p-6 rounded-sm shadow-sm">
          <h2 className="text-lg text-gray-800 font-medium mb-4 pb-2 border-b border-gray-100">
            Product Details of {product.title}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            {product.description}
          </p>
        </div>
      </div>
    </div>
  );
}
