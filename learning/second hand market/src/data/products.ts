import { Product } from '../types';

const categoryData: Record<string, { images: string[], titles: string[] }> = {
  "Women's & Girls' Fashion": {
    images: [
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80",
      "https://images.unsplash.com/photo-1515347619362-74efcb882194?w=500&q=80",
      "https://images.unsplash.com/photo-1550639525-c97d455acf70?w=500&q=80",
      "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=500&q=80",
      "https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=500&q=80",
    ],
    titles: [
      "Floral Summer Dress", "Elegant Evening Gown", "Casual Denim Jacket", "Comfortable Cotton T-Shirt", "Stylish Pleated Skirt", "Designer Silk Blouse", "Winter Wool Coat", "Trendy Crop Top"
    ]
  },
  "Health & Beauty": {
    images: [
      "https://images.unsplash.com/photo-1596462502278-27bf85033e5a?w=500&q=80",
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80",
      "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&q=80",
      "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?w=500&q=80",
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&q=80",
    ],
    titles: [
      "Organic Skincare Face Serum", "Professional Makeup Brush Set", "Matte Lipstick Collection", "Designer Eau De Parfum", "Hydrating Face Cream", "Vitamin C Glowing Serum", "Luxury Bath Bombs", "Natural Hair Oil"
    ]
  },
  "Watches, Bags, Jewellery": {
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
      "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=500&q=80",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&q=80",
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&q=80",
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&q=80",
    ],
    titles: [
      "Luxury Minimalist Wrist Watch", "Women's Elegant Leather Tote Bag", "Diamond Stud Earrings", "Gold Plated Necklace", "Men's Chronograph Watch", "Designer Crossbody Bag", "Silver Charm Bracelet", "Classic Leather Wallet"
    ]
  },
  "Men's & Boys' Fashion": {
    images: [
      "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=500&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80",
      "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=500&q=80",
      "https://images.unsplash.com/photo-1516826957135-700ede19c6ce?w=500&q=80",
      "https://images.unsplash.com/photo-1552874869-5c39ec9288dc?w=500&q=80",
    ],
    titles: [
      "Classic Denim Jacket", "Sport Running Shoes for Men", "Slim Fit Cotton Shirt", "Casual Chino Pants", "Men's Winter Hoodie", "Formal Leather Shoes", "Graphic Print T-Shirt", "Polo Collar Shirt"
    ]
  },
  "Mother & Baby": {
    images: [
      "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=500&q=80",
      "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=500&q=80",
      "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=500&q=80",
      "https://images.unsplash.com/photo-1544126592-807ade215a0b?w=500&q=80",
      "https://images.unsplash.com/photo-1566006011938-f32c25472145?w=500&q=80",
    ],
    titles: [
      "Soft Cotton Baby Romper", "Educational Baby Toys Set", "Comfortable Maternity Dress", "Baby Stroller with Canopy", "Organic Baby Lotion", "Nursing Pillow", "Baby Monitor Camera", "Diaper Bag Backpack"
    ]
  },
  "Electronics Devices": {
    images: [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80",
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
      "https://images.unsplash.com/photo-1516961642265-531546e84af2?w=500&q=80",
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&q=80",
    ],
    titles: [
      "Premium Wireless Noise Canceling Headphones", "Professional DSLR Camera", "Ultra-Slim Business Laptop", "Latest 5G Smartphone", "Instant Film Camera", "10-inch Tablet with Stylus", "Gaming Console Pro", "Smart E-Reader"
    ]
  },
  "TV & Home Appliances": {
    images: [
      "https://images.unsplash.com/photo-1543512214-318c7553f230?w=500&q=80",
      "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80",
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&q=80",
      "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500&q=80",
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&q=80",
    ],
    titles: [
      "Smart Home Speaker with Voice Assistant", "55-inch 4K Smart TV", "Double Door Refrigerator", "Front Load Washing Machine", "Microwave Oven with Grill", "Air Purifier with HEPA Filter", "Robot Vacuum Cleaner", "Electric Water Heater"
    ]
  },
  "Electronic Accessories": {
    images: [
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&q=80",
      "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500&q=80",
      "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&q=80",
      "https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=500&q=80",
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80",
    ],
    titles: [
      "True Wireless Earbuds", "Ergonomic Wireless Mouse", "Mechanical Gaming Keyboard", "Fast Charging Power Bank", "USB-C Hub Adapter", "Smartphone Gimbal Stabilizer", "Laptop Cooling Pad", "Bluetooth Tracker Tag"
    ]
  },
  "Groceries": {
    images: [
      "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=500&q=80",
      "https://images.unsplash.com/photo-1587049352847-81a56d773c1c?w=500&q=80",
      "https://images.unsplash.com/photo-1599508704512-2f19efd1e35f?w=500&q=80",
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&q=80",
      "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=500&q=80",
    ],
    titles: [
      "Organic Green Tea Pack", "Premium Arabica Coffee Beans", "Mixed Nuts & Dry Fruits", "Extra Virgin Olive Oil", "Whole Wheat Pasta", "Organic Honey Jar", "Dark Chocolate Bar", "Assorted Spices Box"
    ]
  },
  "Home & Lifestyle": {
    images: [
      "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=500&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&q=80",
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&q=80",
      "https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=500&q=80",
    ],
    titles: [
      "Modern Ceramic Vase", "Minimalist Wooden Coffee Table", "Soft Cotton Bed Sheets", "Decorative Table Lamp", "Aromatherapy Essential Oil Diffuser", "Plush Throw Blanket", "Wall Art Canvas Print", "Indoor Potted Plant"
    ]
  },
  "Sports & Outdoors": {
    images: [
      "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&q=80",
      "https://images.unsplash.com/photo-1515523110800-9415d13b84a8?w=500&q=80",
      "https://images.unsplash.com/photo-1560243563-062bfc001d68?w=500&q=80",
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&q=80",
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=500&q=80",
    ],
    titles: [
      "Yoga Mat with Alignment Lines", "Adjustable Dumbbell Set", "Camping Tent for 4 Persons", "Professional Tennis Racket", "Hydration Water Bottle", "Resistance Bands Set", "Hiking Backpack", "Cycling Helmet"
    ]
  },
  "Automotive & Motorbike": {
    images: [
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=500&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=500&q=80",
      "https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?w=500&q=80",
      "https://images.unsplash.com/photo-1542362567-b07e54358753?w=500&q=80",
      "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=500&q=80",
    ],
    titles: [
      "Premium Car Wax Polish", "Motorcycle Full Face Helmet", "Car Dash Camera", "Leather Steering Wheel Cover", "Portable Tire Inflator", "Motorcycle Riding Gloves", "Car Wash Shampoo", "LED Headlight Bulbs"
    ]
  }
};

const allCategories = Object.keys(categoryData);

export const generateProducts = (count: number, startIndex: number = 0): Product[] => {
  return Array.from({ length: count }).map((_, i) => {
    const categoryName = allCategories[(startIndex + i) % allCategories.length];
    const data = categoryData[categoryName];
    
    const imageIndex = (startIndex + i) % data.images.length;
    const titleIndex = (startIndex + i) % data.titles.length;
    
    // Ensure price is between 2000 and 10000
    const price = Math.floor(Math.random() * 8000) + 2000;
    const discount = Math.floor(Math.random() * 46) + 5;
    const originalPrice = Math.floor(price / (1 - discount / 100));
    
    return {
      id: startIndex + i,
      title: data.titles[titleIndex],
      category: categoryName,
      image: data.images[imageIndex],
      price,
      originalPrice,
      discount,
      rating: (Math.random() * 1.5 + 3.5).toFixed(1),
      reviews: Math.floor(Math.random() * 500) + 10,
      description: `This is a high-quality ${data.titles[titleIndex].toLowerCase()}. It comes with a premium build, excellent durability, and top-tier performance. Perfect for everyday use or as a gift for your loved ones. Get it now at a massive discount of ${discount}%!`
    };
  });
};

export const flashSaleProducts = generateProducts(6, 0);
export const justForYouProducts = generateProducts(18, 6);

export const getProductsByCategory = (category: string): Product[] => {
  // Find matching category data, or fallback to a random one if not found
  const matchedCategory = Object.keys(categoryData).find(c => 
    c.toLowerCase().includes(category.toLowerCase()) || 
    category.toLowerCase().includes(c.toLowerCase())
  );
  
  const data = matchedCategory ? categoryData[matchedCategory] : categoryData["Electronics Devices"];
  const actualCategory = matchedCategory || category;

  return Array.from({ length: 15 }).map((_, i) => {
    // Ensure price is between 2000 and 10000
    const price = Math.floor(Math.random() * 8000) + 2000;
    const discount = Math.floor(Math.random() * 46) + 5;
    const originalPrice = Math.floor(price / (1 - discount / 100));
    
    const imageIndex = i % data.images.length;
    const titleIndex = i % data.titles.length;
    
    return {
      id: 1000 + i,
      title: data.titles[titleIndex],
      category: actualCategory,
      image: data.images[imageIndex],
      price,
      originalPrice,
      discount,
      rating: (Math.random() * 1.5 + 3.5).toFixed(1),
      reviews: Math.floor(Math.random() * 500) + 10,
      description: `Explore our premium selection in ${actualCategory}. This ${data.titles[titleIndex].toLowerCase()} offers exceptional value and quality.`
    };
  });
};

export const searchProducts = (query: string): Product[] => {
  const q = query.toLowerCase();
  
  // Generate a bunch of products across categories and filter them
  const allProducts = generateProducts(100, 0);
  
  const results = allProducts.filter(p => 
    p.title.toLowerCase().includes(q) || 
    p.category.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q)
  );
  
  // If no results, generate some fake ones based on the query so the user always sees something
  if (results.length === 0) {
    return Array.from({ length: 8 }).map((_, i) => {
      const price = Math.floor(Math.random() * 8000) + 2000;
      const discount = Math.floor(Math.random() * 46) + 5;
      const originalPrice = Math.floor(price / (1 - discount / 100));
      
      return {
        id: 9000 + i,
        title: `Premium ${query} - Model ${i + 1}`,
        category: "Search Results",
        image: `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80`, // fallback image
        price,
        originalPrice,
        discount,
        rating: (Math.random() * 1.5 + 3.5).toFixed(1),
        reviews: Math.floor(Math.random() * 500) + 10,
        description: `This is a high-quality ${query}. It comes with a premium build, excellent durability, and top-tier performance.`
      };
    });
  }
  
  return results;
};
