import { Star } from 'lucide-react';
import { Product } from '../types';
import { useAppContext } from '../context/AppContext';
import { useState } from 'react';

interface JustForYouProps {
  onProductClick: (product: Product) => void;
}

export default function JustForYou({ onProductClick }: JustForYouProps) {
  const { products } = useAppContext();
  const [visibleCount, setVisibleCount] = useState(18);
  
  const approvedProducts = products.filter(p => p.status === 'approved');
  const justForYouProducts = approvedProducts.slice(6, 6 + visibleCount);
  const hasMore = 6 + visibleCount < approvedProducts.length;
  
  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 18);
  };
  
  return (
    <div className="mb-6">
      <h2 className="text-xl text-gray-700 mb-4">Just For You</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {justForYouProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-sm shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full" onClick={() => onProductClick(product)}>
            <div className="relative pb-[100%]">
              <img 
                src={product.image} 
                alt={product.title} 
                className="absolute top-0 left-0 w-full h-full object-cover rounded-t-sm"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 flex flex-col flex-grow">
              <h3 className="text-sm text-gray-800 line-clamp-2 mb-2 flex-grow">{product.title}</h3>
              <div className="text-[#f85606] font-medium text-lg">Rs. {product.price.toLocaleString()}</div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 line-through">Rs. {product.originalPrice.toLocaleString()}</span>
                <span className="text-xs text-gray-800">-{product.discount}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex text-[#faca51]">
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" />
                  <Star size={12} fill="currentColor" className="opacity-50" />
                </div>
                <span className="text-xs text-gray-400">({product.reviews})</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button onClick={handleLoadMore} className="border border-[#f85606] text-[#f85606] px-32 py-3 rounded-sm font-medium hover:bg-[#f85606] hover:text-white transition-colors w-full sm:w-auto">
            LOAD MORE
          </button>
        </div>
      )}
    </div>
  );
}
