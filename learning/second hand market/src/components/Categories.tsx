interface CategoriesProps {
  onCategoryClick: (category: string) => void;
}

export default function Categories({ onCategoryClick }: CategoriesProps) {
  const categories = [
    { name: "Smartphones", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&q=80" },
    { name: "Laptops", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=100&q=80" },
    { name: "Watches", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80" },
    { name: "Headphones", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&q=80" },
    { name: "Cameras", image: "https://images.unsplash.com/photo-1516961642265-531546e84af2?w=100&q=80" },
    { name: "Shoes", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80" },
    { name: "Clothing", image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=100&q=80" },
    { name: "Beauty", image: "https://images.unsplash.com/photo-1596462502278-27bf85033e5a?w=100&q=80" },
    { name: "Sports", image: "https://images.unsplash.com/photo-1515523110800-9415d13b84a8?w=100&q=80" },
    { name: "Home", image: "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=100&q=80" },
    { name: "Toys", image: "https://images.unsplash.com/photo-1558060370-d64111d200e5?w=100&q=80" },
    { name: "Groceries", image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=100&q=80" },
    { name: "Automotive", image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=100&q=80" },
    { name: "Books", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&q=80" },
    { name: "Pets", image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=100&q=80" },
    { name: "Furniture", image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=100&q=80" },
  ];

  return (
    <div className="mb-6">
      <h2 className="text-xl text-gray-700 mb-4">Categories</h2>
      <div className="bg-white rounded-sm shadow-sm grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8">
        {categories.map((cat, idx) => (
          <div 
            key={idx} 
            onClick={() => onCategoryClick(cat.name)}
            className="flex flex-col items-center justify-center p-4 border-r border-b border-gray-100 hover:shadow-md cursor-pointer transition-shadow group"
          >
            <div className="w-12 h-12 mb-2 rounded-full overflow-hidden bg-gray-50 group-hover:scale-110 transition-transform">
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="text-xs text-center text-gray-700">{cat.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
