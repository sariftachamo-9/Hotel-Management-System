import { Star, ChevronRight, Home } from 'lucide-react';
import { Product } from '../types';

interface CategoryResultsProps {
  title: string;
  products: Product[];
  onProductClick: (product: Product) => void;
  onBack: () => void;
}

export default function CategoryResults({ title, products, onProductClick, onBack }: CategoryResultsProps) {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-12">
      {/* Breadcrumb */}
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
        <button onClick={onBack} className="hover:text-[#f85606] flex items-center gap-1">
          <Home size={14} /> Home
        </button>
        <ChevronRight size={14} />
        <span className="text-gray-800">{title}</span>
      </div>

      <div className="max-w-[1200px] mx-auto px-4">
        <h2 className="text-xl text-gray-800 mb-4">{title}</h2>
        
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {products.map((product) => (
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
        ) : (
          <div className="bg-white p-8 text-center rounded-sm shadow-sm">
            <p className="text-gray-500">No products found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
