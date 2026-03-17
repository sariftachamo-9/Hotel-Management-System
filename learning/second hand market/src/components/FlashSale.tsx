import { useState, useEffect } from 'react';
import { Product } from '../types';
import { useAppContext } from '../context/AppContext';

interface FlashSaleProps {
  onProductClick: (product: Product) => void;
  onShopMore: () => void;
}

export default function FlashSale({ onProductClick, onShopMore }: FlashSaleProps) {
  const { products } = useAppContext();
  const flashSaleProducts = products.filter(p => p.status === 'approved').slice(0, 6);
  const [timeLeft, setTimeLeft] = useState({ hours: 12, minutes: 34, seconds: 56 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else {
          seconds = 59;
          if (minutes > 0) {
            minutes--;
          } else {
            minutes = 59;
            if (hours > 0) {
              hours--;
            } else {
              // Reset to 24 hours when it hits 0
              hours = 23;
            }
          }
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (time: number) => time.toString().padStart(2, '0');

  return (
    <div className="mb-6">
      <h2 className="text-xl text-gray-700 mb-4">Flash Sale</h2>
      <div className="bg-white p-4 rounded-sm shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 w-full sm:w-auto">
            <span className="text-[#f85606] font-medium">On Sale Now</span>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Ending in</span>
              <div className="flex gap-1 text-white font-medium">
                <span className="bg-[#f85606] px-2 py-1 rounded-sm">{formatTime(timeLeft.hours)}</span>
                <span className="text-[#f85606] font-bold">:</span>
                <span className="bg-[#f85606] px-2 py-1 rounded-sm">{formatTime(timeLeft.minutes)}</span>
                <span className="text-[#f85606] font-bold">:</span>
                <span className="bg-[#f85606] px-2 py-1 rounded-sm">{formatTime(timeLeft.seconds)}</span>
              </div>
            </div>
          </div>
          <button onClick={onShopMore} className="w-full sm:w-auto text-[#f85606] border border-[#f85606] px-3 py-1.5 sm:py-1 text-sm rounded-sm hover:bg-[#f85606] hover:text-white transition-colors text-center font-medium">
            SHOP MORE
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {flashSaleProducts.map((product) => (
            <div key={product.id} className="group cursor-pointer" onClick={() => onProductClick(product)}>
              <div className="relative mb-2">
                <img 
                  src={product.image} 
                  alt={product.title} 
                  className="w-full aspect-square object-cover rounded-sm"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-0 right-0 bg-[#f85606] text-white text-xs px-1 py-0.5 rounded-bl-sm">
                  -{product.discount}%
                </div>
              </div>
              <h3 className="text-sm text-gray-800 line-clamp-2 mb-1 group-hover:text-[#f85606]">{product.title}</h3>
              <div className="text-[#f85606] font-medium text-lg">Rs. {product.price.toLocaleString()}</div>
              <div className="text-xs text-gray-400 line-through">Rs. {product.originalPrice.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
