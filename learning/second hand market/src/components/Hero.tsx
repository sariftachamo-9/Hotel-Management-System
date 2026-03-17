import { ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

const categoriesData = [
  { name: "Women's & Girls' Fashion" },
  { name: "Health & Beauty" },
  { name: "Watches, Bags, Jewellery" },
  { name: "Men's & Boys' Fashion" },
  { name: "Mother & Baby" },
  { name: "Electronics Devices" },
  { name: "TV & Home Appliances" },
  { name: "Electronic Accessories" },
  { name: "Groceries" },
  { name: "Home & Lifestyle" },
  { name: "Sports & Outdoors" },
  { name: "Automotive & Motorbike" }
];

const slides = [
  {
    id: 1,
    title: "MEGA SALE",
    subtitle: "Up to",
    highlight: "50% OFF",
    suffix: "on top brands",
    tags: ["5% - 50% Discount", "Limited Time"],
    bgClass: "from-[#f85606] to-[#ff8c00]",
    images: [
      { src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80", discount: "-50%" },
      { src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80", discount: "-25%" }
    ]
  },
  {
    id: 2,
    title: "NEW ARRIVALS",
    subtitle: "Discover",
    highlight: "LATEST",
    suffix: "fashion trends",
    tags: ["Free Shipping", "New Season"],
    bgClass: "from-purple-600 to-indigo-600",
    images: [
      { src: "https://images.unsplash.com/photo-1515347619362-74efcb882194?w=300&q=80", discount: "NEW" },
      { src: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=300&q=80", discount: "NEW" }
    ]
  },
  {
    id: 3,
    title: "TECH DEALS",
    subtitle: "Upgrade your",
    highlight: "GADGETS",
    suffix: "today",
    tags: ["Best Prices", "Warranty"],
    bgClass: "from-blue-600 to-cyan-500",
    images: [
      { src: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&q=80", discount: "-15%" },
      { src: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&q=80", discount: "-30%" }
    ]
  }
];

interface HeroProps {
  onCategoryClick: (category: string) => void;
}

export default function Hero({ onCategoryClick }: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[currentSlide];

  return (
    <div className="flex gap-4 mb-6 relative">
      {/* Sidebar Categories */}
      <div className="w-64 bg-white rounded-sm shadow-sm hidden lg:block py-2 relative z-20">
        <ul className="text-[13px] text-gray-600">
          {categoriesData.map((cat, idx) => (
            <li 
              key={idx} 
              onClick={() => onCategoryClick(cat.name)}
              className="px-4 py-1.5 cursor-pointer flex justify-between items-center group hover:bg-gray-50 hover:text-[#f85606]"
            >
              <span>{cat.name}</span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
            </li>
          ))}
        </ul>
      </div>

      {/* Banner Slider */}
      <div className={`flex-1 bg-gradient-to-r ${slide.bgClass} rounded-sm overflow-hidden relative z-10 flex flex-col md:flex-row items-center justify-center md:justify-start p-4 md:p-8 transition-colors duration-500 min-h-[350px] md:min-h-[400px]`}>
        <div className="text-white z-20 w-full md:max-w-[50%] animate-in fade-in slide-in-from-left-8 duration-700 text-center md:text-left pt-4 md:pt-0" key={`text-${slide.id}`}>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight">{slide.title}</h2>
          <p className="text-base md:text-2xl mb-4 md:mb-6 font-medium">
            {slide.subtitle} <span className="font-black text-yellow-300 text-2xl md:text-4xl">{slide.highlight}</span> {slide.suffix}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 md:gap-3 mb-4 md:mb-6">
            {slide.tags.map((tag, i) => (
              <span key={i} className={`${i === 0 ? 'bg-white text-gray-900' : 'bg-black text-white'} text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 rounded-full uppercase tracking-wider`}>
                {tag}
              </span>
            ))}
          </div>
          <button 
            onClick={() => onCategoryClick("Flash Sale")}
            className="bg-white text-gray-900 font-bold px-6 md:px-8 py-2 md:py-3 rounded-sm hover:bg-gray-100 transition-colors shadow-lg text-sm md:text-base"
          >
            SHOP NOW
          </button>
        </div>

        <div className="relative md:absolute md:right-8 md:top-1/2 md:-translate-y-1/2 z-20 flex gap-2 md:gap-6 items-center mt-6 md:mt-0 pb-8 md:pb-0" key={`img-${slide.id}`}>
          <div className="relative w-24 h-24 md:w-40 md:h-40 bg-white rounded-lg p-1.5 md:p-2 shadow-2xl transform -rotate-6 hover:rotate-0 transition-transform duration-300 animate-in fade-in zoom-in duration-500 delay-100">
            <img 
              src={slide.images[0].src} 
              alt="Product 1" 
              className="w-full h-full object-cover rounded"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-yellow-400 text-black text-[10px] md:text-sm font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-full shadow-md border-2 border-white">
              {slide.images[0].discount}
            </div>
          </div>
          <div className="relative w-20 h-20 md:w-32 md:h-32 bg-white rounded-lg p-1.5 md:p-2 shadow-2xl transform rotate-6 mt-8 md:mt-16 hover:rotate-0 transition-transform duration-300 animate-in fade-in zoom-in duration-500 delay-300">
            <img 
              src={slide.images[1].src} 
              alt="Product 2" 
              className="w-full h-full object-cover rounded"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-yellow-400 text-black text-[10px] md:text-sm font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-full shadow-md border-2 border-white">
              {slide.images[1].discount}
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-full h-full bg-white opacity-10 transform skew-x-12 translate-x-1/3"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>

        {/* Slider Controls */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-30">
          {slides.map((_, dot) => (
            <div 
              key={dot} 
              onClick={() => setCurrentSlide(dot)}
              className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-colors ${dot === currentSlide ? 'bg-white' : 'bg-white/50 hover:bg-white/80'}`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
